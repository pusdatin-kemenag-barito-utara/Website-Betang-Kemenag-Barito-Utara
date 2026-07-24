export default function MaintenancePage() {
  const pusdatinUrl =
    process.env.NEXT_PUBLIC_PUSDATIN_URL ||
    "https://pusdatin.kemenag-baritoutara.go.id";

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-50 flex flex-col">
      <iframe
        src={`${pusdatinUrl}/maintenance?app=Si+Betang+(E-Arsip)`}
        title="Sistem Sedang Pemeliharaan"
        className="w-full h-full border-none"
      />
    </div>
  );
}
