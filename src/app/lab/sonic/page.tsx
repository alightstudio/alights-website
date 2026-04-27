import LabFrame from '@/components/LabFrame'

export const metadata = {
  title: '光韵 | Alights Lab',
  description: '点击 · 指尖旋律 · Mikutap',
}

export default function SonicPage() {
  return (
    <LabFrame
      src="/experiments/sonic/index.html"
      title="光韵"
      subtitle="点击 · 指尖旋律"
    />
  )
}
