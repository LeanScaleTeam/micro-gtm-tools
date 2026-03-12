/**
 * Cross-Reference Client (MGT-E1 Frontend)
 *
 * Fetches cross-tool data from the backend and renders banners
 * showing gaps between tools.
 */

const CrossReference = {
  _data: null,

  /**
   * Fetch cross-reference data from the backend.
   * @returns {Promise<Object>} cross-reference result
   */
  async fetch() {
    try {
      const resp = await AuthUI.apiFetch('/api/tools/cross-reference');
      if (!resp.ok) return null;
      this._data = await resp.json();
      return this._data;
    } catch (e) {
      console.warn('Cross-reference fetch failed:', e);
      return null;
    }
  },

  /**
   * Format a currency value.
   */
  formatCurrency(n) {
    if (n === null || n === undefined) return '--';
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    if (abs >= 1000000) return sign + '$' + (abs / 1000000).toFixed(1) + 'M';
    if (abs >= 1000) return sign + '$' + (abs / 1000).toFixed(0) + 'K';
    return sign + '$' + abs.toFixed(0);
  },

  /**
   * Render a cross-reference banner into the given container element.
   * @param {string} containerId - DOM element ID
   * @param {string} toolContext  - 'growth-model' | 'sales-capacity' | 'marketing-plan'
   */
  renderBanner(containerId, toolContext) {
    const container = document.getElementById(containerId);
    if (!container || !this._data) return;

    const d = this._data;
    let html = '';

    if (toolContext === 'growth-model') {
      // Show coverage from sales capacity + marketing plan
      const reqBookings = d.growthModel.requiredBookingsPerMonth;
      const quotaCap = d.salesCapacity.totalQuotaCapacity;
      const coveragePct = reqBookings > 0 ? Math.round((quotaCap / 12) / reqBookings * 100) : 0;
      const pipelineGap = d.gaps.pipelineGap;

      html = `
        <div class="cross-ref-banner">
          <div class="cross-ref-title">Cross-Tool Insights</div>
          <div class="cross-ref-items">
            <div class="cross-ref-item">
              <span class="cross-ref-label">Sales Capacity Coverage</span>
              <span class="cross-ref-value ${coveragePct >= 100 ? 'positive' : 'negative'}">${coveragePct}% of required bookings</span>
            </div>
            <div class="cross-ref-item">
              <span class="cross-ref-label">Pipeline Gap (vs Marketing Plan)</span>
              <span class="cross-ref-value ${pipelineGap >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(pipelineGap)}/mo ${pipelineGap >= 0 ? 'surplus' : 'shortfall'}</span>
            </div>
          </div>
        </div>
      `;
    }

    if (toolContext === 'sales-capacity') {
      const reqBookings = d.growthModel.requiredBookingsPerMonth;
      const quotaGap = d.gaps.quotaGap;

      html = `
        <div class="cross-ref-banner">
          <div class="cross-ref-title">Growth Model Requirements</div>
          <div class="cross-ref-items">
            <div class="cross-ref-item">
              <span class="cross-ref-label">Required Bookings (from Growth Model)</span>
              <span class="cross-ref-value">${this.formatCurrency(reqBookings)}/mo</span>
            </div>
            <div class="cross-ref-item">
              <span class="cross-ref-label">Quota Gap</span>
              <span class="cross-ref-value ${quotaGap >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(quotaGap)}/mo ${quotaGap >= 0 ? 'surplus' : 'shortfall'}</span>
            </div>
          </div>
        </div>
      `;
    }

    if (toolContext === 'marketing-plan') {
      const reqPipeline = d.growthModel.requiredPipelinePerMonth;
      const projPipeline = d.marketingPlan.projectedPipelinePerMonth;
      const pipelineGap = d.gaps.pipelineGap;

      html = `
        <div class="cross-ref-banner">
          <div class="cross-ref-title">Growth Model Requirements</div>
          <div class="cross-ref-items">
            <div class="cross-ref-item">
              <span class="cross-ref-label">Required Pipeline (from Growth Model)</span>
              <span class="cross-ref-value">${this.formatCurrency(reqPipeline)}/mo</span>
            </div>
            <div class="cross-ref-item">
              <span class="cross-ref-label">Your Projected Pipeline</span>
              <span class="cross-ref-value">${this.formatCurrency(projPipeline)}/mo</span>
            </div>
            <div class="cross-ref-item">
              <span class="cross-ref-label">Pipeline Gap</span>
              <span class="cross-ref-value ${pipelineGap >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(pipelineGap)}/mo ${pipelineGap >= 0 ? 'surplus' : 'shortfall'}</span>
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  },
};
