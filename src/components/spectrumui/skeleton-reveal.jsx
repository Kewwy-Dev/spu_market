import React from 'react';

export function SkeletonReveal({ loading, skeleton, children, className = '' }) {
  return (
    <div className={`spectrum-skeleton-reveal ${loading ? 'is-loading' : 'is-loaded'} ${className}`} aria-busy={loading}>
      {loading && <div className="spectrum-skeleton-layer" aria-hidden="true">{skeleton}</div>}
      <div className="spectrum-skeleton-content">{children}</div>
    </div>
  );
}

export function SkeletonBlock({ className = '' }) {
  return <span className={`spectrum-skeleton-block ${className}`} />;
}

export function ProductGridSkeleton({ count = 6 }) {
  return <div className="products-two-col-grid" aria-hidden="true">{Array.from({ length: count }, (_, index) => (
    <article className="spectrum-product-skeleton" key={index}>
      <SkeletonBlock className="spectrum-product-skeleton-image" />
      <div className="spectrum-product-skeleton-copy"><SkeletonBlock /><SkeletonBlock /><SkeletonBlock /></div>
    </article>
  ))}</div>;
}
