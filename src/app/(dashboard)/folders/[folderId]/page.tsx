import { PageBanner } from "@/components/ui/PageBanner"
import { FolderOpen } from "lucide-react"
import { FileBrowserView } from "@/components/FileBrowser/FileBrowserView"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { formatFileSize } from "@/lib/utils"
import { format } from "date-fns"
import { id } from "date-fns/locale"

export const dynamic = 'force-dynamic'

export default async function FolderPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ folderId: string }>
  searchParams: Promise<{ q?: string }>
}) {
  // In Next.js 15, params is a Promise
  const resolvedParams = await params
  const { folderId } = resolvedParams

  const resolvedSearchParams = await searchParams
  const query = resolvedSearchParams.q || ""
  
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: metadata } = await supabase.from('users_metadata').select('bidang_id, role').eq('id', user.id).single()
  const userBidangId = metadata?.bidang_id || 'global'
  const userRole = metadata?.role || ''

  // If Admin Bidang tries to access the global root, redirect them to their own folder
  if (folderId === 'root' && userRole === 'Admin Bidang' && metadata?.bidang_id) {
    const { data: rootFolder } = await supabase
      .from('folders')
      .select('id')
      .eq('bidang_id', metadata.bidang_id)
      .is('parent_id', null)
      .single()

    if (rootFolder) {
      redirect(`/folders/${rootFolder.id}`)
    }
  }

  // Fetch folders
  let foldersQuery = supabase.from('folders').select('*').is('deleted_at', null)
  if (query) {
    foldersQuery = foldersQuery.textSearch('fts_doc', query, { config: 'simple', type: 'websearch' })
  } else {
    if (folderId === 'root') {
      foldersQuery = foldersQuery.is('parent_id', null)
    } else {
      foldersQuery = foldersQuery.eq('parent_id', folderId)
    }
  }
  const { data: folders = [] } = await foldersQuery.order('name')

  // Fetch files
  let filesQuery = supabase.from('files').select('*').is('deleted_at', null)
  if (query) {
    filesQuery = filesQuery.textSearch('fts_doc', query, { config: 'simple', type: 'websearch' })
  } else {
    if (folderId === 'root') {
      filesQuery = filesQuery.is('folder_id', null)
    } else {
      filesQuery = filesQuery.eq('folder_id', folderId)
    }
  }
  const { data: files = [] } = await filesQuery.order('created_at', { ascending: false })

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "d MMM yyyy", { locale: id })
  }

  // Fetch folder sizes via single batch RPC to optimize page load times
  const folderSizeMap: Record<string, number> = {}
  if (folders && folders.length > 0) {
    const folderIds = folders.map(f => f.id)
    const { data: sizes } = await supabase.rpc('get_folders_size', { target_folder_ids: folderIds })
    
    if (sizes && Array.isArray(sizes)) {
      sizes.forEach((s: { folder_id: string; total_size: number | string }) => {
        folderSizeMap[s.folder_id] = Number(s.total_size) || 0
      })
    }
  }

  const items = [
    ...(folders || []).map(f => {
      const folderSize = folderSizeMap[f.id] || 0
      return {
        id: f.id,
        name: f.name,
        type: "folder" as const,
        size: folderSize > 0 ? formatFileSize(folderSize) : "-",
        updatedAt: formatDate(f.updated_at),
        rawDate: f.updated_at,
        isRestricted: f.is_restricted || false
      }
    }),
    ...(files || []).map(f => ({
      id: f.id,
      name: f.name,
      type: "file" as const,
      mimeType: f.mime_type,
      size: formatFileSize(f.size_bytes),
      updatedAt: formatDate(f.updated_at),
      rawDate: f.updated_at,
      isRestricted: f.is_restricted || false,
      objectKey: f.r2_object_key
    }))
  ]

  // Breadcrumbs
  const breadcrumbs = [
    { id: "root", name: "Root" }
  ]
  
  if (folderId !== 'root') {
    const { data: paths, error } = await supabase.rpc('get_folder_path', { target_folder_id: folderId })
    if (error) {
      console.error("Error fetching breadcrumbs:", error)
    }
    if (paths && paths.length > 0) {
      breadcrumbs.push(...paths.reverse())
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageBanner
        title="File Browser"
        description="Jelajahi dan kelola dokumen pada seksi/bidang Anda"
        icon={<FolderOpen className="h-8 w-8 text-white" />}
      />

      <FileBrowserView 
        folderId={folderId} 
        initialItems={items} 
        breadcrumbs={breadcrumbs}
        userBidangId={userBidangId}
        initialSearchQuery={query}
      />
    </div>
  )
}
