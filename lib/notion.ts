import { Client } from '@notionhq/client';
import type { Post, TagFilterItem } from '@/types/blog';
import type {
    PageObjectResponse,
    PersonUserObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { NotionToMarkdown } from 'notion-to-md';

// Notion 클라이언트 생성 (환경 변수는 런타임에 검증)
export const notion = new Client({
    auth: process.env.NOTION_TOKEN,
});

// 환경 변수 검증 함수 (런타임에만 호출)
function validateEnvVars() {
    if (!process.env.NOTION_TOKEN) {
        throw new Error('NOTION_TOKEN 환경 변수가 설정되지 않았습니다.');
    }

    if (!process.env.NOTION_DATABASE_ID) {
        throw new Error('NOTION_DATABASE_ID 환경 변수가 설정되지 않았습니다.');
    }
}

const n2m = new NotionToMarkdown({ notionClient: notion });

function getPostMetadata(page: PageObjectResponse): Post {
    const { properties } = page;

    const getCoverImage = (cover: PageObjectResponse['cover']) => {
        if (!cover) return '';

        switch (cover.type) {
            case 'external':
                return cover.external.url;
            case 'file':
                return cover.file.url;
            default:
                return '';
        }
    };

    return {
        id: page.id,
        title:
            properties.Title.type === 'title'
                ? (properties.Title.title[0]?.plain_text ?? '')
                : '',
        description:
            properties.Description.type === 'rich_text'
                ? (properties.Description.rich_text[0]?.plain_text ?? '')
                : '',
        coverImage: getCoverImage(page.cover),
        tags:
            properties.Tags.type === 'multi_select'
                ? properties.Tags.multi_select.map((tag) => tag.name)
                : [],
        author:
            properties.Author.type === 'people'
                ? ((properties.Author.people[0] as PersonUserObjectResponse)
                      ?.name ?? '')
                : '',
        date:
            properties.Date.type === 'date'
                ? (properties.Date.date?.start ?? '')
                : '',
        nodifiedDate: page.last_edited_time,
        slug:
            properties.Slug.type === 'rich_text'
                ? (properties.Slug.rich_text[0]?.plain_text ?? page.id)
                : page.id,
    };
}

export const getPostBySlug = async (
    slug: string
): Promise<{
    markdown: string;
    post: Post;
}> => {
    try {
        // 환경 변수 검증
        validateEnvVars();

        const response = await notion.databases.query({
            database_id: process.env.NOTION_DATABASE_ID!,
            filter: {
                and: [
                    {
                        property: 'Slug',
                        rich_text: {
                            equals: slug,
                        },
                    },
                    {
                        property: 'Status',
                        select: {
                            equals: 'Published',
                        },
                    },
                ],
            },
        });

        // 결과가 없을 경우 에러 처리
        if (!response.results || response.results.length === 0) {
            throw new Error(
                `슬러그 "${slug}"에 해당하는 게시물을 찾을 수 없습니다.`
            );
        }

        const page = response.results[0] as PageObjectResponse;

        // 페이지가 유효한지 확인
        if (!('properties' in page)) {
            throw new Error('유효하지 않은 페이지 형식입니다.');
        }

        const mdBlocks = await n2m.pageToMarkdown(page.id);
        const { parent } = n2m.toMarkdownString(mdBlocks);

        return {
            markdown: parent,
            post: getPostMetadata(page),
        };
    } catch (error) {
        // Notion API 에러를 더 명확하게 처리
        if (error instanceof Error) {
            throw new Error(
                `게시물을 가져오는 중 오류가 발생했습니다: ${error.message}`
            );
        }
        throw error;
    }
};

export const getPublishedPosts = async (tag?: string): Promise<Post[]> => {
    try {
        // 환경 변수 검증
        validateEnvVars();

        const response = await notion.databases.query({
            database_id: process.env.NOTION_DATABASE_ID!,
            filter: {
                property: 'Status',
                select: {
                    equals: 'Published',
                },
                and: [
                    {
                        property: 'Status',
                        select: {
                            equals: 'Published',
                        },
                    },
                    ...(tag && tag !== '전체'
                        ? [
                              {
                                  property: 'Tags',
                                  multi_select: {
                                      contains: tag,
                                  },
                              },
                          ]
                        : []),
                ],
            },
            sorts: [
                {
                    property: 'Date',
                    direction: 'descending',
                },
            ],
        });

        // 결과가 없을 경우 빈 배열 반환
        if (!response.results || response.results.length === 0) {
            return [];
        }

        return response.results
            .filter((page): page is PageObjectResponse => 'properties' in page)
            .map(getPostMetadata);
    } catch (error) {
        // Notion API 에러를 더 명확하게 처리
        console.error('게시물 목록을 가져오는 중 오류 발생:', error);
        // 에러 발생 시 빈 배열 반환하여 앱이 크래시되지 않도록 함
        return [];
    }
};

export const getTags = async (): Promise<TagFilterItem[]> => {
    const posts = await getPublishedPosts();

    // 모든 태그를 추출하고 각 태그의 출현 횟수를 계산
    const tagCount = posts.reduce(
        (acc, post) => {
            post.tags?.forEach((tag) => {
                acc[tag] = (acc[tag] || 0) + 1;
            });
            return acc;
        },
        {} as Record<string, number>
    );

    // TagFilterItem 형식으로 변환
    const tags: TagFilterItem[] = Object.entries(tagCount).map(
        ([name, count]) => ({
            id: name,
            name,
            count,
        })
    );

    // "전체" 태그 추가
    tags.unshift({
        id: 'all',
        name: '전체',
        count: posts.length,
    });

    // 태그 이름 기준으로 정렬 ("전체" 태그는 항상 첫 번째에 위치하도록 제외)
    const [allTag, ...restTags] = tags;
    const sortedTags = restTags.sort((a, b) => a.name.localeCompare(b.name));

    return [allTag, ...sortedTags];
};
