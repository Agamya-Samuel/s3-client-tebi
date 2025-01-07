export interface StorageItem {
	Key: string;
	LastModified: Date;
	Size: number;
	Type: 'file' | 'folder';
	ContentType?: string;
	isPublic?: boolean;
}

export interface UploadResponse {
	success: boolean;
	message: string;
	key?: string;
}

export interface DeleteResponse {
	success: boolean;
	message: string;
}

export interface ListResponse {
	items: StorageItem[];
	prefix: string;
}

export interface PermissionResponse {
	success: boolean;
	message: string;
	isPublic: boolean;
}
