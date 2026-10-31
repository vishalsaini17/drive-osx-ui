export type LayoutType = 'title' | 'content' | 'two-column' | 'blank';

export type AnimationType = 'none' | 'fade' | 'slide' | 'zoom' | 'appear';

export type ShapeType = 'rectangle' | 'circle' | 'arrow' | 'star' | 'triangle' | 'badge';

export type ChartType = 'bar' | 'line' | 'pie';

/** Slide dimensions (File > Page setup…), same three presets Google Slides
 * offers minus "Custom" — every slide in a deck shares one, since per-slide
 * aspect ratio would make the thumbnail rail and Presentation Mode's own
 * layout ambiguous. */
export type PageSize = '4:3' | '16:9' | '16:10';

export interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'video' | 'table' | 'chart' | 'shape' | 'icon';
  x: number; // Percentage or px position
  y: number;
  width: number;
  height: number;
  zIndex: number;
  rotation?: number;
  animation?: AnimationType;
  
  // Text element props
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold' | 'black';
  color?: string;
  align?: 'left' | 'center' | 'right';
  bgColor?: string;

  // Image / Video props
  url?: string;
  caption?: string;

  // Shape props
  shapeType?: ShapeType;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;

  // Table props
  tableData?: string[][];

  // Chart props
  chartType?: ChartType;
  chartTitle?: string;
  chartData?: { label: string; value: number; color?: string }[];

  // Icon props
  iconName?: string;
}

export interface SlideComment {
  id: string;
  author: string;
  avatar?: string;
  text: string;
  createdAt: string;
  x?: number;
  y?: number;
}

export interface Slide {
  id: string;
  title: string;
  layout: LayoutType;
  bgColor: string;
  transition: AnimationType;
  notes: string;
  elements: SlideElement[];
  comments: SlideComment[];
}

export interface PresentationDeck {
  id: string;
  title: string;
  theme: 'modern-dark' | 'clean-light' | 'emerald-glass' | 'sunset-gradient';
  pageSize: PageSize;
  slides: Slide[];
}

export interface PeerCollaborator {
  id: string;
  name: string;
  color: string;
  activeSlideId: string;
  cursorPos?: { x: number; y: number };
}
