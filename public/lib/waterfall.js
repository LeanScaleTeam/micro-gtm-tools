/**
 * ARR Waterfall Chart Data Builder (MGT-E2)
 *
 * Computes the ARR bridge: Starting ARR -> +New Business -> +Expansion -> -Churn -> Ending ARR
 * Returns both raw values and SVG-ready bar data.
 *
 * Can be used in both browser and Node.js (for testing).
 */

(function(exports) {
  function parseNum(str) {
    return parseFloat(String(str).replace(/[,$%]/g, '')) || 0;
  }

  /**
   * Build waterfall data from segment definitions and computed results.
   *
   * @param {Array} segments       - Array of segment objects with .id, .values.currentARR, .values.nrr, .values.churn
   * @param {Object} segmentResults - Map of segmentId -> { results, y1Totals, y2Totals, lastMonth }
   * @returns {Object} { startingARR, newBusiness, expansion, churn, endingARR, bars }
   */
  function buildWaterfallData(segments, segmentResults) {
    if (!segments || segments.length === 0 || !segmentResults) {
      return {
        startingARR: 0, newBusiness: 0, expansion: 0, churn: 0, endingARR: 0,
        bars: [
          { label: 'Starting ARR', value: 0, color: 'blue', type: 'total' },
          { label: 'New Business', value: 0, color: 'green', type: 'positive' },
          { label: 'Expansion', value: 0, color: 'green', type: 'positive' },
          { label: 'Churn', value: 0, color: 'red', type: 'negative' },
          { label: 'Ending ARR', value: 0, color: 'blue', type: 'total' },
        ],
      };
    }

    let startingARR = 0;
    let endingARR = 0;
    let totalBookings = 0;
    let totalChurn = 0;

    segments.forEach(seg => {
      const v = seg.values || {};
      const currentARR = parseNum(v.currentARR);
      startingARR += currentARR;

      const data = segmentResults[seg.id];
      if (data) {
        endingARR += data.lastMonth.arr;
        // Sum bookings and churn across both years
        totalBookings += (data.y1Totals.bookings || 0) + (data.y2Totals.bookings || 0);
        totalChurn += (data.y1Totals.churn || 0) + (data.y2Totals.churn || 0);
      }
    });

    // Churn is negative in the waterfall
    const churn = -totalChurn;

    // Expansion = endingARR - startingARR - newBusiness - churn
    // We know: endingARR = startingARR + newBusiness + expansion + churn
    // So: expansion = endingARR - startingARR - newBusiness - churn
    const expansion = endingARR - startingARR - totalBookings - churn;
    const newBusiness = totalBookings;

    const bars = [
      { label: 'Starting ARR', value: startingARR, color: 'blue', type: 'total' },
      { label: 'New Business', value: newBusiness, color: 'green', type: 'positive' },
      { label: 'Expansion', value: expansion, color: 'green', type: 'positive' },
      { label: 'Churn', value: churn, color: 'red', type: 'negative' },
      { label: 'Ending ARR', value: endingARR, color: 'blue', type: 'total' },
    ];

    return { startingARR, newBusiness, expansion, churn, endingARR, bars };
  }

  exports.buildWaterfallData = buildWaterfallData;

})(typeof module !== 'undefined' && module.exports ? module.exports : (window.WaterfallChart = {}));
