interface CheerTagSource {
  content: string;
}

export interface PopularCheerTag {
  tag: string;
  count: number;
}

const HASHTAG_PATTERN = /#([0-9A-Za-z_가-힣]+)/g;

export const extractPopularCheerTags = (
  posts: CheerTagSource[],
  limit = 5,
): PopularCheerTag[] => {
  const counts = new Map<string, { tag: string; count: number; firstSeen: number }>();
  let firstSeen = 0;

  posts.forEach((post) => {
    const tagsInPost = new Map<string, string>();
    for (const match of post.content.matchAll(HASHTAG_PATTERN)) {
      const tag = match[1];
      if (tag) tagsInPost.set(tag.toLocaleLowerCase('ko-KR'), tag);
    }

    tagsInPost.forEach((tag, key) => {
      const current = counts.get(key);
      if (current) {
        current.count += 1;
      } else {
        counts.set(key, { tag, count: 1, firstSeen });
        firstSeen += 1;
      }
    });
  });

  return [...counts.values()]
    .sort((left, right) => right.count - left.count || left.firstSeen - right.firstSeen)
    .slice(0, Math.max(0, limit))
    .map(({ tag, count }) => ({ tag, count }));
};
