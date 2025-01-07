'use client';

import { getFileIcon } from '@/utils/storage';

interface FileIconProps {
	fileName: string;
	className?: string;
}

export function FileIcon({ fileName, className }: FileIconProps) {
	const Icon = getFileIcon(fileName);
	return <Icon className={className} />;
}
