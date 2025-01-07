import { StorageItem } from '@/types/storage';
import {
	LucideIcon,
	File,
	FileImage,
	FileVideo,
	FileAudio,
	Text,
	FileJson,
	FileCode2,
	FolderArchive,
	FileText,
	FileSpreadsheet,
	FileType2,
	Presentation,
} from 'lucide-react';

export const getFileType = (contentType: string | undefined): string => {
	if (!contentType) return 'unknown';

	if (contentType.startsWith('image/')) return 'image';
	if (contentType.startsWith('video/')) return 'video';
	if (contentType.startsWith('audio/')) return 'audio';
	if (contentType === 'application/pdf') return 'pdf';
	if (contentType === 'text/plain') return 'text';
	if (contentType === 'application/json') return 'json';
	if (
		contentType.includes('document') ||
		contentType.includes('msword') ||
		contentType.includes('officedocument')
	)
		return 'document';

	return 'other';
};

export const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const sortItems = (items: StorageItem[]): StorageItem[] => {
	return [...items].sort((a, b) => {
		// Folders first
		if (a.Type !== b.Type) {
			return a.Type === 'folder' ? -1 : 1;
		}
		// Then alphabetically
		return a.Key.localeCompare(b.Key);
	});
};

export const getParentPath = (path: string): string => {
	const parts = path.split('/').filter(Boolean);
	parts.pop();
	return parts.length ? `${parts.join('/')}/` : '';
};

export function truncateName(name: string, maxLength: number = 30): string {
	if (name.length <= maxLength) return name;
	const extension = name.includes('.') ? name.split('.').pop() : '';
	if (extension) {
		const nameWithoutExt = name.slice(0, -(extension.length + 1));
		const truncatedName =
			nameWithoutExt.slice(0, maxLength - extension.length - 4) + '...';
		return `${truncatedName}.${extension}`;
	}
	return name.slice(0, maxLength - 3) + '...';
}

export const getFileIcon = (fileName: string): LucideIcon => {
	const extension = fileName.split('.').pop()?.toLowerCase() || '';

	// Images
	if (
		['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)
	) {
		return FileImage;
	}

	// Videos
	if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(extension)) {
		return FileVideo;
	}

	// Audio
	if (['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(extension)) {
		return FileAudio;
	}

	// Text Documents
	if (['txt', 'md'].includes(extension)) {
		return Text;
	}

	// Word Documents
	if (['doc', 'docx', 'odt', 'rtf'].includes(extension)) {
		return FileType2;
	}

	// Excel Spreadsheets
	if (['xls', 'xlsx', 'csv', 'ods'].includes(extension)) {
		return FileSpreadsheet;
	}

	// PowerPoint Presentations
	if (['ppt', 'pptx', 'odp'].includes(extension)) {
		return Presentation;
	}

	// Code files
	if (
		[
			'js',
			'ts',
			'jsx',
			'tsx',
			'html',
			'css',
			'py',
			'java',
			'cpp',
			'c',
			'php',
			'rb',
		].includes(extension)
	) {
		return FileCode2;
	}

	// JSON
	if (extension === 'json') {
		return FileJson;
	}

	// PDF
	if (extension === 'pdf') {
		return FileText;
	}

	// Archives
	if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(extension)) {
		return FolderArchive;
	}

	// Default file icon for unknown types
	return File;
};
