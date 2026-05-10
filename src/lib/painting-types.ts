export interface PaintingTemplate {
  id: string
  title: string
  artist: string
  year: string
  pixelData: string[][] // TEMPLATE_SIZE × TEMPLATE_SIZE
}
