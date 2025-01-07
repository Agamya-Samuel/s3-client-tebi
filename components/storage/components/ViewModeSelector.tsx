'use client';

import { Button } from '@/components/ui/button';
import { Grid, List, Table } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'grid' | 'list' | 'detail';

interface ViewModeSelectorProps {
	viewMode: ViewMode;
	onViewModeChange: (mode: ViewMode) => void;
}

export function ViewModeSelector({
	viewMode,
	onViewModeChange,
}: ViewModeSelectorProps) {
	return (
		<div className="flex gap-1 border border-blue-200 rounded-lg p-1">
			<Button
				variant="ghost"
				size="sm"
				className={cn(
					'hover:bg-blue-50 hover:text-blue-600',
					viewMode === 'grid' && 'bg-blue-50 text-blue-600'
				)}
				onClick={() => onViewModeChange('grid')}
			>
				<Grid className="h-4 w-4" />
			</Button>
			<Button
				variant="ghost"
				size="sm"
				className={cn(
					'hover:bg-blue-50 hover:text-blue-600',
					viewMode === 'list' && 'bg-blue-50 text-blue-600'
				)}
				onClick={() => onViewModeChange('list')}
			>
				<List className="h-4 w-4" />
			</Button>
			<Button
				variant="ghost"
				size="sm"
				className={cn(
					'hover:bg-blue-50 hover:text-blue-600',
					viewMode === 'detail' && 'bg-blue-50 text-blue-600'
				)}
				onClick={() => onViewModeChange('detail')}
			>
				<Table className="h-4 w-4" />
			</Button>
		</div>
	);
}
