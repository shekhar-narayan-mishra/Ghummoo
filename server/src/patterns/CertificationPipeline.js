// Pattern: Chain of Responsibility
// Why: Certification submission must pass multiple validation gates in sequence.
// Each handler is independent and can be added, removed, or reordered without touching others.

// Abstraction: abstract handler class — pipeline runner only knows BookingHandler interface
class AbstractCertificationHandler {
  constructor() {
    this._next = null;
  }

  setNext(handler) {
    this._next = handler;
    return handler; // fluent chaining
  }

  async next(context) {
    if (this._next) return this._next.handle(context);
  }

  // Abstraction: concrete handlers must implement this
  async handle(context) {
    throw new Error('handle() must be implemented by concrete handler');
  }
}

// Handler 1: validates file exists and is a valid document type
class DocumentValidationHandler extends AbstractCertificationHandler {
  async handle(context) {
    const { file } = context;
    if (!file) {
      throw new Error('Certification document is required');
    }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      throw new Error('Document must be PDF, JPEG, PNG, or WEBP');
    }
    return this.next(context);
  }
}

// Handler 2: checks guide profile is complete enough to apply
class ProfileCompletenessHandler extends AbstractCertificationHandler {
  async handle(context) {
    const { guide } = context;
    const missing = [];
    if (!guide.bio || guide.bio.trim().length < 20) missing.push('bio (min 20 chars)');
    if (!guide.city || !guide.city.trim()) missing.push('city');
    if (!guide.languages || guide.languages.length === 0) missing.push('languages');
    if (!guide.specialties || guide.specialties.length === 0) missing.push('specialties');
    if (!guide.pricePerDay || guide.pricePerDay <= 0) missing.push('pricePerDay');

    if (missing.length > 0) {
      throw new Error(`Guide profile incomplete. Please fill: ${missing.join(', ')}`);
    }
    return this.next(context);
  }
}

// Handler 3: ensures guide has no existing approved certification
class DuplicateApplicationHandler extends AbstractCertificationHandler {
  async handle(context) {
    const { guide, CertificationModel } = context;
    const existing = await CertificationModel.findOne({
      guideId: guide._id,
      status: 'approved',
    });
    if (existing) {
      throw new Error('This guide already has an approved certification');
    }
    // Also reject if there's already a pending application
    const pending = await CertificationModel.findOne({
      guideId: guide._id,
      status: 'pending',
    });
    if (pending) {
      throw new Error('A certification application is already under review');
    }
    return this.next(context);
  }
}

// Handler 4 (final): persists the Certification document to MongoDB
class PersistenceHandler extends AbstractCertificationHandler {
  async handle(context) {
    const { guide, documentUrl, CertificationModel } = context;
    const certification = await CertificationModel.create({
      guideId: guide._id,
      documentUrl,
      status: 'pending',
    });
    context.certification = certification;
    return context;
  }
}

// Pipeline builder — wires the chain and runs it
function buildCertificationPipeline() {
  const docValidator = new DocumentValidationHandler();
  const profileCheck = new ProfileCompletenessHandler();
  const dupCheck = new DuplicateApplicationHandler();
  const persist = new PersistenceHandler();

  docValidator.setNext(profileCheck).setNext(dupCheck).setNext(persist);
  return docValidator;
}

module.exports = { buildCertificationPipeline, DocumentValidationHandler, ProfileCompletenessHandler, DuplicateApplicationHandler, PersistenceHandler };
