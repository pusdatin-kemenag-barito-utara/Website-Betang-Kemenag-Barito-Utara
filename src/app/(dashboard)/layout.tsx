import { DashboardLayoutClient } from "@/components/DashboardLayoutClient"
import { getAppSettings } from "@/app/(dashboard)/settings/actions"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { disableRightClick } = await getAppSettings()

  return <DashboardLayoutClient disableRightClick={disableRightClick}>{children}</DashboardLayoutClient>
}
