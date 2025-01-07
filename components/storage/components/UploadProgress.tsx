'use client';

import { Progress } from '@/components/ui/progress';

interface UploadProgressItem {
	fileName: string;
	progress: number;
}

interface UploadProgressProps {
	items: UploadProgressItem[];
}

export function UploadProgress({ items }: UploadProgressProps) {
	if (items.length === 0) return null;

	return (
		<div className="space-y-2">
			{items.map((item, index) => (
				<div key={index} className="space-y-1">
					<div className="flex justify-between text-sm text-gray-600">
						<span>{item.fileName}</span>
						<span>{item.progress.toFixed(0)}%</span>
					</div>
					<Progress
						value={item.progress}
						className="w-full bg-blue-100"
					/>
				</div>
			))}
		</div>
	);
}
