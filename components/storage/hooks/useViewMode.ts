'use client';

import { useState, useEffect } from 'react';
import { ViewMode } from '../components/ViewModeSelector';

export function useViewMode() {
	const [viewMode, setViewMode] = useState<ViewMode>('list');

	useEffect(() => {
		const savedMode = localStorage.getItem(
			'storageViewMode'
		) as ViewMode | null;
		if (savedMode) {
			setViewMode(savedMode);
		}
	}, []);

	const updateViewMode = (mode: ViewMode) => {
		setViewMode(mode);
		localStorage.setItem('storageViewMode', mode);
	};

	return {
		viewMode,
		updateViewMode,
	};
}
