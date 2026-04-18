// Pattern: Decorator Pattern
// Why: Guide profile badges (certified, top-rated, local expert) are computed at query time
// and compose independently — no need to store them in the DB or modify the base Guide object.

// Base decorator identity wrapper
class GuideProfile {
  constructor(guide) {
    this.guide = guide;
  }

  decorate() {
    return {
      ...this.guide,
      badges: [],
    };
  }
}

// Decorator: adds 'certified' badge and tier label
class CertifiedDecorator {
  constructor(profile) {
    this.profile = profile;
  }

  decorate() {
    const base = this.profile.decorate();
    if (base.certificationStatus === 'approved') {
      base.badges.push({
        type: 'certified',
        label: `${base.certificationTier ? base.certificationTier.charAt(0).toUpperCase() + base.certificationTier.slice(1) : 'Certified'} Guide`,
        color: base.certificationTier === 'gold' ? '#FFD700'
             : base.certificationTier === 'silver' ? '#C0C0C0'
             : '#CD7F32',
      });
    }
    return base;
  }
}

// Decorator: adds 'top_rated' badge when avgRating >= 4.7 and totalReviews >= 30
class TopRatedDecorator {
  constructor(profile) {
    this.profile = profile;
  }

  decorate() {
    const base = this.profile.decorate();
    if (base.avgRating >= 4.7 && base.totalReviews >= 30) {
      base.isTopRated = true;
      base.badges.push({ type: 'top_rated', label: 'Top Rated', color: '#4F46E5' });
    } else {
      base.isTopRated = false;
    }
    return base;
  }
}

// Decorator: adds 'local_expert' badge when guide has 50+ completed bookings in their city
class LocalExpertDecorator {
  constructor(profile) {
    this.profile = profile;
  }

  decorate() {
    const base = this.profile.decorate();
    if (base.totalCompletedBookings >= 50) {
      base.isLocalExpert = true;
      base.badges.push({ type: 'local_expert', label: 'Local Expert', color: '#059669' });
    } else {
      base.isLocalExpert = false;
    }
    return base;
  }
}

// Compose only the decorators that apply to each guide
function decorateGuideProfile(guide) {
  let profile = new GuideProfile(guide);

  if (guide.certificationStatus === 'approved') {
    profile = new CertifiedDecorator(profile);
  }
  if (guide.avgRating >= 4.7 && guide.totalReviews >= 30) {
    profile = new TopRatedDecorator(profile);
  }
  if (guide.totalCompletedBookings >= 50) {
    profile = new LocalExpertDecorator(profile);
  }

  return profile.decorate();
}

module.exports = { GuideProfile, CertifiedDecorator, TopRatedDecorator, LocalExpertDecorator, decorateGuideProfile };
