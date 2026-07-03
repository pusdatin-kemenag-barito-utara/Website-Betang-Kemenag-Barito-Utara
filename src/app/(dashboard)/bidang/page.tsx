import { PageBanner } from "@/components/ui/PageBanner"
import { Building2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { BidangView } from "@/components/Bidang/BidangView"
import { redirect } from "next/navigation"

export default async function BidangManagementPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentUserMeta } = await supabase
    .rpc('get_pusdatin_user', { email_address: user.email })

  const isSuperAdmin = currentUserMeta?.role === 'Super Admin' || currentUserMeta?.role === 'super_admin'

  if (!isSuperAdmin) {
    redirect('/')
  }

  // Fetch all active files to count them per bidang accurately
  let bidangData: { id: string; name: string; count: number; sort_order: number }[] = []
  
  const { data: bidangRaw, error: bidangErr } = await supabase
    .from('bidang')
    .select('id, name, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (bidangRaw && !bidangErr) {
    const { data: filesData } = await supabase
      .from('files')
      .select('bidang_id')
      .is('deleted_at', null)

    bidangData = bidangRaw.map(b => {
      const count = filesData?.filter(f => f.bidang_id === b.id).length || 0
      return {
        id: b.id,
        name: b.name,
        sort_order: b.sort_order || 0,
        count
      }
    })
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageBanner
        title="Manajemen Bidang / Seksi"
        description="Kelola daftar seksi dan bidang yang terdaftar dalam sistem E-Arsip"
        icon={<Building2 className="h-8 w-8 text-white" />}
      />

      <BidangView bidangData={bidangData} />
    </div>
  )
}
