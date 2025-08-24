// src/types/news.ts

export interface ScrapedNews {
  title: string;
  description: string;
  content?: string;
  url: string;
  source_name: string;
  author?: string;
  published_at: Date;
  image_url?: string;
  category: string;
}

export interface NewsSource {
  name: string;
  url: string;
  baseUrl: string;
  selector: {
    container: string;
    title: string;
    link: string;
    description?: string;
    image?: string;
    author?: string;
    publishedAt?: string;
  };
}

export interface RSSFeed {
  url: string;
  name: string;
}

export interface ArticleContent {
  content: string;
  image: string;
}
