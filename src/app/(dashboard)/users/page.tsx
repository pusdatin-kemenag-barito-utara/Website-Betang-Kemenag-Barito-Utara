import { PageBanner } from "@/components/ui/PageBanner"
import { Users } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UsersView } from "@/components/Users/UsersView"

export default async function UsersManagementPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check if current user is Super Admin
  const { data: currentUserMeta, error: metaError } = await supabase
    .from('users_metadata')
    .select('role')
    .eq('id', user.id)
    .single()

  console.log("DEBUG USERS PAGE - User ID:", user.id)
  console.log("DEBUG USERS PAGE - Meta:", currentUserMeta)
  console.log("DEBUG USERS PAGE - Error:", metaError)

  const isSuperAdmin = currentUserMeta?.role === 'Super Admin' || currentUserMeta?.role === 'super_admin';

  if (!isSuperAdmin) {
    redirect('/');
  }

  // Fetch all users with their bidang name
  // Assuming Supabase supports foreign table joins via select('*, bidang(name)')
  const { data: usersData } = await supabase
    .from('users_metadata')
    .select(`
      id,
      username,
      full_name,
      role,
      bidang (
        name
      )
    `)
    .order('created_at', { ascending: false })

  const users = (usersData || []).map((u) => ({
    id: u.id as string,
    username: u.username as string,
    full_name: u.full_name as string,
    role: u.role as string,
    bidang: Array.isArray(u.bidang)
      ? (u.bidang[0]?.name ?? null)
      : ((u.bidang as { name: string } | null)?.name ?? null),
  }))

  // Fetch bidang list for the dropdown
  const { data: bidangList } = await supabase
    .from('bidang')
    .select('id, name')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageBanner
        title="Manajemen Pengguna"
        description="Kelola akun pengguna dan hak akses sistem E-Arsip"
        icon={<Users className="h-8 w-8 text-white" />}
      />

      <UsersView 
        initialUsers={users} 
        bidangList={bidangList || []}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  )
}
