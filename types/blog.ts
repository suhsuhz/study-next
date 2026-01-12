export interface TagFilterItem {
    id: string;
    name: string;
    count: number;
}

export interface Post {
    id: string;
    title: string;
    description?: string;
    coverImage?: string;
    tags?: string[];
    author?: string;
    date?: string;
    nodifiedDate?: string;
    slug: string;
}
