"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2"
import { PutObjectCommand, GetObjectCommand, CopyObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { logAudit } from "@/lib/audit"

export async function createFolder(name: string, parentId: string | null) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    // Get user metadata to know which bidang this belongs to
    const { data: metadata, error: metaError } = await supabase
      .rpc('get_pusdatin_user', { email_address: user.email })

    if (metaError || !metadata) throw new Error("Metadata user tidak ditemukan")

    let finalBidangId = null;
    if (parentId && parentId !== 'root') {
      const { data: parentFolder } = await supabase.from('folders').select('bidang_id').eq('id', parentId).single();
      if (parentFolder && parentFolder.bidang_id) {
        finalBidangId = parentFolder.bidang_id;
      }
    }

    // Insert folder
    const { data, error } = await supabase
      .from('folders')
      .insert({
        name,
        parent_id: parentId === 'root' ? null : parentId,
        bidang_id: finalBidangId,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath(`/folders/${parentId || 'root'}`)
    await logAudit({
      action: "INSERT",
      target: `Folder: ${name}`,
      afterState: data
    })
    return { success: true, data }
  } catch (error) {
    console.error("Error creating folder:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function saveFileMetadata({
  name,
  folderId,
  r2ObjectKey,
  mimeType,
  sizeBytes,
}: {
  name: string
  folderId: string | null
  r2ObjectKey: string
  mimeType: string
  sizeBytes: number
}) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    // Get user metadata
    const { data: metadata, error: metaError } = await supabase
      .rpc('get_pusdatin_user', { email_address: user.email })

    if (metaError || !metadata) throw new Error("Metadata user tidak ditemukan")

    let finalBidangId = null;
    if (folderId && folderId !== 'root') {
      const { data: parentFolder } = await supabase.from('folders').select('bidang_id').eq('id', folderId).single();
      if (parentFolder && parentFolder.bidang_id) {
        finalBidangId = parentFolder.bidang_id;
      }
    }

    // Check if file already exists in this folder
    let query = supabase.from('files').select('id, r2_object_key, size_bytes').eq('name', name).is('deleted_at', null)
    if (folderId === 'root' || !folderId) {
      query = query.is('folder_id', null)
    } else {
      query = query.eq('folder_id', folderId)
    }
    const { data: existingFile } = await query.maybeSingle()

    let resultData;

    if (existingFile) {
      // Save current file as a version
      await supabase.from('file_versions').insert({
        file_id: existingFile.id,
        r2_object_key: existingFile.r2_object_key,
        size_bytes: existingFile.size_bytes,
        uploaded_by: user.id
      });

      // Update the existing file record
      const { data, error } = await supabase
        .from('files')
        .update({
          r2_object_key: r2ObjectKey,
          mime_type: mimeType,
          size_bytes: sizeBytes,
          uploaded_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingFile.id)
        .select()
        .single()

      if (error) throw error
      resultData = data;
    } else {
      // Insert new file metadata
      const { data, error } = await supabase
        .from('files')
        .insert({
          name,
          folder_id: folderId === 'root' ? null : folderId,
          bidang_id: finalBidangId,
          r2_object_key: r2ObjectKey,
          mime_type: mimeType,
          size_bytes: sizeBytes,
          uploaded_by: user.id
        })
        .select()
        .single()

      if (error) throw error
      resultData = data;
    }

    revalidatePath(`/folders/${folderId || 'root'}`)
    await logAudit({
      action: existingFile ? "UPDATE" : "INSERT",
      target: `File: ${name}`,
      beforeState: existingFile ? existingFile : null,
      afterState: resultData
    })
    return { success: true, data: resultData }
  } catch (error) {
    console.error("Error saving file metadata:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getPresignedUploadUrl(filePath: string, fileType: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    const client = getR2Client()
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filePath,
      ContentType: fileType,
    })

    const presignedUrl = await getSignedUrl(client, command, { expiresIn: 3600 })
    return { success: true, presignedUrl, r2ObjectKey: filePath }
  } catch (error) {
    console.error("Error generating upload presigned URL:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getPresignedDownloadUrl(r2ObjectKey: string, downloadName?: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    const client = getR2Client()
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2ObjectKey,
      ResponseContentDisposition: downloadName ? `attachment; filename="${downloadName}"` : "inline",
    })

    const presignedUrl = await getSignedUrl(client, command, { expiresIn: 3600 })
    return { success: true, presignedUrl }
  } catch (error) {
    console.error("Error generating download presigned URL:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function deleteItem(id: string, type: "folder" | "file", folderId: string | null) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    const table = type === "folder" ? "folders" : "files"
    
    // If it's a file, we DO NOT remove from storage here because this is soft delete.
    // Permanent deletion from R2 should only happen when emptying the trash.
    
    const { error } = await supabase
      .from(table)
      .update({ 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      
    if (error) throw error

    revalidatePath(`/folders/${folderId || 'root'}`)
    await logAudit({
      action: "DELETE",
      target: `${type === "folder" ? "Folder" : "File"} ID: ${id}`
    })
    return { success: true }
  } catch (error) {
    console.error(`Error deleting ${type}:`, error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function deleteItemsBatch(items: { id: string, type: "folder" | "file" }[], folderId: string | null) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    const fileIds = items.filter(i => i.type === "file").map(i => i.id)
    const folderIds = items.filter(i => i.type === "folder").map(i => i.id)

    if (fileIds.length > 0) {
      // We DO NOT remove from storage here because this is soft delete.
      const { error: fileErr } = await supabase
        .from('files')
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .in('id', fileIds)
        
      if (fileErr) throw fileErr
    }

    if (folderIds.length > 0) {
      const { error: folderErr } = await supabase
        .from('folders')
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .in('id', folderIds)
        
      if (folderErr) throw folderErr
    }

    revalidatePath(`/folders/${folderId || 'root'}`)
    await logAudit({
      action: "DELETE",
      target: `Batch hapus ${items.length} item`
    })
    return { success: true }
  } catch (error) {
    console.error(`Error deleting batch items:`, error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function renameItem(id: string, type: "folder" | "file", newName: string, folderId: string | null) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    const table = type === "folder" ? "folders" : "files"
    
    const { error } = await supabase
      .from(table)
      .update({ 
        name: newName,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      
    if (error) throw error

    revalidatePath(`/folders/${folderId || 'root'}`)
    await logAudit({
      action: "UPDATE",
      target: `Rename ${type === "folder" ? "Folder" : "File"} ke ${newName}`,
      afterState: { id, newName }
    })
    return { success: true }
  } catch (error) {
    console.error(`Error renaming ${type}:`, error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function moveItem(itemId: string, itemType: "folder" | "file", targetFolderId: string | null, currentFolderId: string | null) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    // Prevent moving a folder into itself (basic check)
    if (itemType === "folder" && itemId === targetFolderId) {
      throw new Error("Tidak dapat memindahkan folder ke dalam dirinya sendiri")
    }

    const table = itemType === "folder" ? "folders" : "files"
    const columnToUpdate = itemType === "folder" ? "parent_id" : "folder_id"
    
    const { error } = await supabase
      .from(table)
      .update({ 
        [columnToUpdate]: targetFolderId === 'root' ? null : targetFolderId,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      
    if (error) throw error

    revalidatePath(`/folders/${currentFolderId || 'root'}`)
    if (targetFolderId !== currentFolderId) {
      revalidatePath(`/folders/${targetFolderId || 'root'}`)
    }
    
    await logAudit({
      action: "UPDATE",
      target: `Move ${itemType} ke folder ${targetFolderId || 'root'}`,
      afterState: { id: itemId, targetFolderId }
    })

    return { success: true }
  } catch (error) {
    console.error(`Error moving ${itemType}:`, error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function copySingleFile(supabase: Awaited<ReturnType<typeof createClient>>, client: S3Client, file: { name: string, r2_object_key: string, mime_type: string, size_bytes: number }, targetFolderId: string | null, targetBidangId: string | null, userId: string, isTopLevel = false) {
  const extIndex = file.name.lastIndexOf('.');
  const baseName = extIndex !== -1 ? file.name.substring(0, extIndex) : file.name;
  const ext = extIndex !== -1 ? file.name.substring(extIndex) : '';
  
  let newName = file.name;
  
  if (isTopLevel) {
     let query = supabase.from('files').select('id').eq('name', newName).is('deleted_at', null);
     if (targetFolderId) query = query.eq('folder_id', targetFolderId);
     else query = query.is('folder_id', null);
     
     const { data: exists } = await query.maybeSingle();
     if (exists) {
       newName = `${baseName} - Salinan${ext}`;
     }
  }

  const newObjectKey = `${crypto.randomUUID()}${ext}`;
  
  const command = new CopyObjectCommand({
    Bucket: R2_BUCKET_NAME,
    CopySource: encodeURI(`${R2_BUCKET_NAME}/${file.r2_object_key}`),
    Key: newObjectKey
  });
  await client.send(command);

  const { data, error } = await supabase.from('files').insert({
    name: newName,
    folder_id: targetFolderId,
    bidang_id: targetBidangId,
    r2_object_key: newObjectKey,
    mime_type: file.mime_type,
    size_bytes: file.size_bytes,
    uploaded_by: userId
  }).select().single();
  if (error) throw error;
  return data;
}

async function copyFolderRecursive(supabase: Awaited<ReturnType<typeof createClient>>, client: S3Client, sourceFolder: { id: string, name: string }, targetParentId: string | null, targetBidangId: string | null, userId: string, isTopLevel = false) {
  let newName = sourceFolder.name;
  if (isTopLevel) {
     let query = supabase.from('folders').select('id').eq('name', newName).is('deleted_at', null);
     if (targetParentId) query = query.eq('parent_id', targetParentId);
     else query = query.is('parent_id', null);
     
     const { data: exists } = await query.maybeSingle();
     if (exists) {
       newName = `${newName} - Salinan`;
     }
  }

  const { data: newFolder, error } = await supabase.from('folders').insert({
    name: newName,
    parent_id: targetParentId,
    bidang_id: targetBidangId,
    created_by: userId
  }).select().single();
  if (error) throw error;

  // Copy files
  const { data: files } = await supabase.from('files').select('*').eq('folder_id', sourceFolder.id).is('deleted_at', null);
  if (files && files.length > 0) {
    for (const f of files) {
      await copySingleFile(supabase, client, f, newFolder.id, targetBidangId, userId, false);
    }
  }

  // Copy folders recursively
  const { data: folders } = await supabase.from('folders').select('*').eq('parent_id', sourceFolder.id).is('deleted_at', null);
  if (folders && folders.length > 0) {
    for (const f of folders) {
      await copyFolderRecursive(supabase, client, f, newFolder.id, targetBidangId, userId, false);
    }
  }
}

export async function copyItem(itemId: string, itemType: "folder" | "file", targetFolderId: string | null, currentFolderId: string | null) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    if (itemType === "folder" && itemId === targetFolderId) {
      throw new Error("Tidak dapat menyalin folder ke dalam dirinya sendiri")
    }

    const { data: metadata, error: metaError } = await supabase
      .rpc('get_pusdatin_user', { email_address: user.email })

    if (metaError || !metadata) throw new Error("Metadata user tidak ditemukan")

    let finalBidangId = null;
    if (targetFolderId && targetFolderId !== 'root') {
      const { data: parentFolder } = await supabase.from('folders').select('bidang_id').eq('id', targetFolderId).single();
      if (parentFolder && parentFolder.bidang_id) {
        finalBidangId = parentFolder.bidang_id;
      }
    }

    const s3Client = getR2Client()

    if (itemType === "file") {
      const { data: file, error: fileError } = await supabase.from('files').select('*').eq('id', itemId).single()
      if (fileError || !file) throw new Error("File sumber tidak ditemukan")
      await copySingleFile(supabase, s3Client, file, targetFolderId === 'root' ? null : targetFolderId, finalBidangId, user.id, true)
    } else {
      const { data: folder, error: folderError } = await supabase.from('folders').select('*').eq('id', itemId).single()
      if (folderError || !folder) throw new Error("Folder sumber tidak ditemukan")
      await copyFolderRecursive(supabase, s3Client, folder, targetFolderId === 'root' ? null : targetFolderId, finalBidangId, user.id, true)
    }

    revalidatePath(`/folders/${currentFolderId || 'root'}`)
    if (targetFolderId !== currentFolderId) {
      revalidatePath(`/folders/${targetFolderId || 'root'}`)
    }
    
    await logAudit({
      action: "INSERT",
      target: `Copy ${itemType} ke folder ${targetFolderId || 'root'}`,
      afterState: { id: itemId, targetFolderId }
    })

    return { success: true }
  } catch (error) {
    console.error(`Error copying ${itemType}:`, error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getFoldersByBidang() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    const { data: metadata, error: metaError } = await supabase
      .rpc('get_pusdatin_user', { email_address: user.email })

    if (metaError || !metadata) throw new Error("Metadata user tidak ditemukan")

    const query = supabase
      .from('folders')
      .select('id, name, parent_id')
      .is('deleted_at', null)

    const { data, error } = await query

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error(`Error fetching folders:`, error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getFileVersions(fileId: string) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    const { data, error } = await supabase
      .from('file_versions')
      .select('*') // TODO: Map uploaded_by to pusdatin.users if needed

      .eq('file_id', fileId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error(`Error fetching file versions:`, error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function restoreFileVersion(fileId: string, versionId: string, folderId: string | null) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    // Get the version details
    const { data: version, error: versionError } = await supabase
      .from('file_versions')
      .select('*')
      .eq('id', versionId)
      .single()

    if (versionError || !version) throw new Error("Versi file tidak ditemukan")

    // Get current file to save as a version before restoring
    const { data: currentFile, error: fileError } = await supabase
      .from('files')
      .select('id, r2_object_key, size_bytes')
      .eq('id', fileId)
      .single()

    if (fileError || !currentFile) throw new Error("File saat ini tidak ditemukan")

    // Save current as version
    await supabase.from('file_versions').insert({
      file_id: currentFile.id,
      r2_object_key: currentFile.r2_object_key,
      size_bytes: currentFile.size_bytes,
      uploaded_by: user.id
    });

    // Update file with restored version
    const { error: updateError } = await supabase
      .from('files')
      .update({
        r2_object_key: version.r2_object_key,
        size_bytes: version.size_bytes,
        updated_at: new Date().toISOString(),
        uploaded_by: user.id
      })
      .eq('id', fileId)

    if (updateError) throw updateError

    revalidatePath(`/folders/${folderId || 'root'}`)
    await logAudit({
      action: "UPDATE",
      target: `Restore File Version untuk file ID: ${fileId}`
    })
    return { success: true }
  } catch (error) {
    console.error(`Error restoring file version:`, error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getDownloadUrlsForItems(items: { id: string, type: "folder" | "file", name: string }[]) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    const client = getR2Client()
    
    // We will collect all files to download here: { r2Key, downloadPath }
    const filesToDownload: { r2Key: string, downloadPath: string }[] = []

    for (const item of items) {
      if (item.type === "file") {
        // fetch file details
        const { data: fileData } = await supabase
          .from('files')
          .select('r2_object_key, name')
          .eq('id', item.id)
          .single()
        
        if (fileData) {
          filesToDownload.push({
            r2Key: fileData.r2_object_key,
            downloadPath: fileData.name // single file in root of the zip
          })
        }
      } else if (item.type === "folder") {
        // use RPC to get all files in folder
        const { data: nestedFiles } = await supabase.rpc('get_all_files_in_folder', { target_folder_id: item.id })
        
        if (nestedFiles && nestedFiles.length > 0) {
          for (const nf of nestedFiles) {
            filesToDownload.push({
              r2Key: nf.r2_object_key,
              downloadPath: `${nf.relative_path}/${nf.file_name}`
            })
          }
        }
      }
    }

    // Generate presigned URLs
    const results = await Promise.all(
      filesToDownload.map(async (file) => {
        const command = new GetObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: file.r2Key,
          ResponseContentDisposition: `attachment; filename="${file.downloadPath.split('/').pop()}"`
        })
        const url = await getSignedUrl(client, command, { expiresIn: 3600 })
        return {
          url,
          path: file.downloadPath
        }
      })
    )

    return { success: true, files: results }
  } catch (error) {
    console.error("Error getting download URLs:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
