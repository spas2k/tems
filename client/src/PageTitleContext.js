/**
 * @file React context for dynamic page title management.
 * @module PageTitleContext
 *
 * Provides a shared setPageTitle function so detail pages can update the
 * header breadcrumb title from anywhere in the component tree.
 */
import { createContext } from 'react';
export const PageTitleContext = createContext({ setPageTitle: () => {} });
