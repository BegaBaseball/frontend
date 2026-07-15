import { LANDING_CHEER_POSTS } from '../landingShowcaseData';

export default function LandingCheerVignette() {
  return (
    <div className="landing-cheer-vignette">
      {LANDING_CHEER_POSTS.map((post) => (
        <article className="landing-vignette-card landing-cheer-post" key={post.handle}>
          <header>
            <span className={`landing-cheer-avatar landing-cheer-avatar-${post.team}`} aria-hidden="true">
              {post.avatarLabel}
            </span>
            <span className="landing-cheer-author">
              <strong>{post.author}</strong>
              <small>{post.handle} · <time>{post.time}</time></small>
            </span>
            {post.followLabel && <span className="landing-cheer-follow">{post.followLabel}</span>}
          </header>

          <p>{post.body}</p>

          <div className="landing-cheer-metrics">
            <span className={post.liked ? 'landing-cheer-liked' : undefined}>
              <i data-anim={post.liked || undefined} aria-hidden="true">
                {post.liked ? '♥' : '♡'}
              </i>
              좋아요 {post.likes}
            </span>
            <span>
              <i aria-hidden="true">●</i>
              댓글 {post.comments}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
