import { createContext } from 'react';
import type { Context } from 'react';

/** What an alert is about: it picks the alert's colors and its default icon. */
export type AlertStatus = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

/**
 * The status of the enclosing `Alert.Root`, for the parts that depend on it
 * (`Alert.Indicator` picks its icon by it). `info` outside a root.
 */
export const AlertStatusContext: Context<AlertStatus> = createContext<AlertStatus>('info');
