import { useEffect, useState } from 'react';
import { Toast } from '@/components/ui/toast';
import { Progress } from '@/components/ui/progress';

interface AutoClosingToastProps {
	title: string;
	description?: string;
	variant?: 'default' | 'destructive';
	duration?: number;
	onOpenChange: (open: boolean) => void;
}

export function AutoClosingToast({
	title,
	description,
	variant = 'default',
	duration = 3000, // 3 seconds default
	onOpenChange,
}: AutoClosingToastProps) {
	const [progress, setProgress] = useState(100);
	const [intervalTime] = useState(10); // Update every 10ms

	useEffect(() => {
		const startTime = Date.now();
		const endTime = startTime + duration;

		const timer = setInterval(() => {
			const now = Date.now();
			const remaining = endTime - now;
			const newProgress = (remaining / duration) * 100;

			if (remaining <= 0) {
				clearInterval(timer);
				onOpenChange(false);
			} else {
				setProgress(newProgress);
			}
		}, intervalTime);

		return () => clearInterval(timer);
	}, [duration, intervalTime, onOpenChange]);

	return (
		<Toast variant={variant}>
			<div className="grid gap-1">
				<div className="font-medium">{title}</div>
				{description && (
					<div className="text-sm opacity-90">{description}</div>
				)}
				<Progress
					value={progress}
					className="h-0.5 mt-1"
					indicatorClassName={
						variant === 'destructive'
							? 'bg-destructive'
							: 'bg-blue-600'
					}
				/>
			</div>
		</Toast>
	);
}
