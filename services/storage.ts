import axios from 'axios';
import {
	StorageItem,
	UploadResponse,
	DeleteResponse,
	ListResponse,
} from '@/types/storage';

const API_BASE_URL =
	process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const storageService = {
	async listItems(prefix: string = ''): Promise<ListResponse> {
		const response = await axios.get(`${API_BASE_URL}/storage/list`, {
			params: { prefix },
		});
		return response.data;
	},

	async uploadFile(file: File, path: string): Promise<UploadResponse> {
		const formData = new FormData();
		formData.append('file', file);
		formData.append('path', path);

		const response = await axios.post(
			`${API_BASE_URL}/storage/upload`,
			formData,
			{
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			}
		);
		return response.data;
	},

	async deleteItem(key: string): Promise<DeleteResponse> {
		const response = await axios.delete(`${API_BASE_URL}/storage/delete`, {
			params: { key },
		});
		return response.data;
	},

	async createFolder(path: string): Promise<UploadResponse> {
		const response = await axios.post(
			`${API_BASE_URL}/storage/create-folder`,
			{
				path: path.endsWith('/') ? path : `${path}/`,
			}
		);
		return response.data;
	},

	getFileUrl(key: string): string {
		return `${API_BASE_URL}/storage/file/${encodeURIComponent(key)}`;
	},

	getDownloadUrl(key: string): string {
		return `${API_BASE_URL}/storage/download/${encodeURIComponent(key)}`;
	},
};
