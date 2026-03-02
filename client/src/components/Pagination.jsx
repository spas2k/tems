import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const PAGE_SIZES = [10, 25, 50];

export default function Pagination({ currentPage, totalItems, pageSize, onPageChange, onPageSizeChange }) {
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const effectivePageSize = pageSize === 'all' ? totalItems : pageSize;
  const start = totalItems === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1;
  const end = Math.min(currentPage * effectivePageSize, totalItems);

  return (
    <div className="pagination-bar">
      <div className="pagination-info">
        <span className="pagination-rows-label">Rows per page:</span>
        <select
          className="pagination-select"
          value={pageSize}
          onChange={e => {
            const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
            onPageSizeChange(val);
          }}
        >
          {PAGE_SIZES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
          <option value="all">All</option>
        </select>
        <span className="pagination-range">
          {totalItems === 0 ? '0 results' : `${start}–${end} of ${totalItems}`}
        </span>
      </div>

      {pageSize !== 'all' && totalPages > 1 && (
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            title="First page"
          >
            <ChevronsLeft size={14} />
          </button>
          <button
            className="pagination-btn"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            title="Previous page"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="pagination-page-indicator">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="pagination-btn"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="Next page"
          >
            <ChevronRight size={14} />
          </button>
          <button
            className="pagination-btn"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            title="Last page"
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
