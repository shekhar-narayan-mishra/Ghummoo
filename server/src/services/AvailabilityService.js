// USE CASES COVERED (from useCaseDiagram.md):
// - Manage Availability → addSlots(), removeSlot(), getSlots()

const dayjs = require('dayjs');
const AvailabilitySlot = require('../models/AvailabilitySlot');
const Guide = require('../models/Guide');

// SOLID - SRP: AvailabilityService only manages guide availability slots
class AvailabilityService {
  async getSlots(guideId, month) {
    // month format: YYYY-MM
    let filter = { guideId };
    if (month) {
      const start = dayjs(month, 'YYYY-MM').startOf('month').toDate();
      const end = dayjs(month, 'YYYY-MM').endOf('month').toDate();
      filter.date = { $gte: start, $lte: end };
    }
    return AvailabilitySlot.find(filter).sort({ date: 1 }).lean();
  }

  async addSlots(guideId, dates) {
    // Bulk upsert — ignore duplicates (unique index handles them)
    const operations = dates.map((dateStr) => ({
      updateOne: {
        filter: { guideId, date: new Date(dateStr) },
        update: { $setOnInsert: { guideId, date: new Date(dateStr), isBooked: false } },
        upsert: true,
      },
    }));
    await AvailabilitySlot.bulkWrite(operations);
    return this.getSlots(guideId);
  }

  async removeSlot(guideId, dateStr) {
    const date = new Date(dateStr);
    const slot = await AvailabilitySlot.findOne({ guideId, date }).lean();
    if (!slot) throw new Error('Availability slot not found');
    // Business rule 7: cannot delete a slot within a confirmed or in_progress booking
    if (slot.isBooked) {
      throw new Error('Cannot remove an availability slot that has an active booking');
    }
    await AvailabilitySlot.deleteOne({ guideId, date });
    return { message: 'Slot removed' };
  }

  async markSlotsBooked(guideId, startDate, endDate) {
    const start = dayjs(startDate).startOf('day').toDate();
    const end = dayjs(endDate).endOf('day').toDate();
    await AvailabilitySlot.updateMany(
      { guideId, date: { $gte: start, $lte: end } },
      { isBooked: true }
    );
  }

  async markSlotsAvailable(guideId, startDate, endDate) {
    const start = dayjs(startDate).startOf('day').toDate();
    const end = dayjs(endDate).endOf('day').toDate();
    await AvailabilitySlot.updateMany(
      { guideId, date: { $gte: start, $lte: end } },
      { isBooked: false }
    );
  }

  async validateDatesAvailable(guideId, startDate, endDate) {
    const start = dayjs(startDate).startOf('day').toDate();
    const end = dayjs(endDate).endOf('day').toDate();

    const slots = await AvailabilitySlot.find({
      guideId,
      date: { $gte: start, $lte: end },
      isBooked: false,
    }).lean();

    const totalDays = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
    if (slots.length < totalDays) {
      throw new Error('One or more selected dates are not available');
    }
    return true;
  }
}

module.exports = AvailabilityService;
