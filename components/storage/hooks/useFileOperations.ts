'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import * as storageActions from '@/app/actions/storage';
import { StorageItem } from '@/types/storage';
import { getParentPath } from '@/utils/storage';

export function useFileOperations(onItemsChange: () => Promise<void>) {
	const [isDeletingItem, setIsDeletingItem] = useState<string | null>(null);
	const { toast } = useToast();

	const handleDelete = async (item: StorageItem) => {
		try {
			setIsDeletingItem(item.Key);
			const response = await storageActions.deleteItem(item.Key);

			if (response.success) {
				toast({
					title: 'Success',
					description: 'Item deleted successfully',
					variant: 'success',
				});
				await onItemsChange();
			}
		} catch (error) {
			toast({
				title: 'Error',
				description:
					error instanceof Error
						? error.message
						: 'Failed to delete item',
				variant: 'destructive',
			});
		} finally {
			setIsDeletingItem(null);
		}
	};

	const handleRename = async (
		oldPath: string,
		newName: string,
		type: 'file' | 'folder'
	) => {
		try {
			const parentPath = getParentPath(oldPath);
			const newPath = `${parentPath}${newName}${
				type === 'folder' ? '/' : ''
			}`;

			const response = await storageActions.renameItem(oldPath, newPath);

			if (response.success) {
				toast({
					title: 'Success',
					description: 'Item renamed successfully',
					variant: 'success',
				});
				await onItemsChange();
				return true;
			}
			return false;
		} catch (error) {
			toast({
				title: 'Error',
				description: `Failed to rename item: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
				variant: 'destructive',
				duration: 5000,
			});
			return false;
		}
	};

	const handlePermissionChange = async (
		item: StorageItem,
		isPublic: boolean
	) => {
		try {
			const response = await storageActions.setFilePermission(
				item.Key,
				isPublic
			);
			toast({
				title: 'Success',
				description: response.message,
				variant: 'success',
			});
			await onItemsChange();
			return true;
		} catch (error) {
			toast({
				title: 'Error',
				description:
					error instanceof Error
						? error.message
						: 'Failed to update file access',
				variant: 'destructive',
			});
			return false;
		}
	};

	const handleCreateFolder = async (folderPath: string) => {
		try {
			const response = await storageActions.createFolder(folderPath);
			if (response.success) {
				toast({
					title: 'Success',
					description: 'Folder created successfully',
					variant: 'success',
				});
				await onItemsChange();
				return true;
			}
			return false;
		} catch (error) {
			toast({
				title: 'Error',
				description:
					error instanceof Error
						? error.message
						: 'Failed to create folder',
				variant: 'destructive',
			});
			return false;
		}
	};

	return {
		isDeletingItem,
		handleDelete,
		handleRename,
		handlePermissionChange,
		handleCreateFolder,
	};
}
