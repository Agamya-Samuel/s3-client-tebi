'use client';

import { Card } from '@/components/ui/card';
import { Folder } from 'lucide-react';
import { StorageItem } from '@/types/storage';
import { FileIcon } from '../FileIcon';
import { ItemMenu } from '../ItemMenu';
import { cn } from '@/lib/utils';
import { formatFileSize, truncateName } from '@/utils/storage';

interface GridViewProps {
	items: StorageItem[];
	onItemClick: (item: StorageItem) => void;
	onItemView: (item: StorageItem) => void;
	onItemDelete: (item: StorageItem) => void;
	onItemRename: (item: StorageItem) => void;
	onItemPermissionChange: (
		item: StorageItem,
		isPublic: boolean
	) => Promise<void>;
	isDeletingItem: string | null;
	draggedOverFolder: string | null;
	onFolderDragOver: (e: React.DragEvent, key: string) => void;
	onFolderDragLeave: (e: React.DragEvent) => void;
	onFolderDrop: (e: React.DragEvent, key: string) => void;
}

export function GridView({
	items,
	onItemClick,
	onItemView,
	onItemDelete,
	onItemRename,
	onItemPermissionChange,
	isDeletingItem,
	draggedOverFolder,
	onFolderDragOver,
	onFolderDragLeave,
	onFolderDrop,
}: GridViewProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
			{items.map((item) => (
				<Card
					key={item.Key}
					className={cn(
						'p-4 flex items-center justify-between cursor-pointer border-blue-200',
						item.Type === 'folder' && draggedOverFolder === item.Key
							? 'bg-blue-100 border-blue-400 border-dashed'
							: 'hover:bg-blue-50'
					)}
					onClick={() => onItemClick(item)}
					onDragOver={
						item.Type === 'folder'
							? (e) => onFolderDragOver(e, item.Key)
							: undefined
					}
					onDragLeave={
						item.Type === 'folder' ? onFolderDragLeave : undefined
					}
					onDrop={
						item.Type === 'folder'
							? (e) => onFolderDrop(e, item.Key)
							: undefined
					}
				>
					<div className="flex items-center gap-2">
						{item.Type === 'folder' ? (
							<Folder className="h-6 w-6 text-blue-600" />
						) : (
							<FileIcon
								fileName={item.Key}
								className="h-6 w-6 text-blue-600"
							/>
						)}
						<div>
							<p className="font-medium text-blue-900">
								{truncateName(
									item.Type === 'folder'
										? item.Key.split('/')
												.filter(Boolean)
												.slice(-1)[0] || item.Key
										: item.Key.split('/').pop() || ''
								)}
							</p>
							<p className="text-sm text-blue-500">
								{item.Type === 'file' &&
									formatFileSize(item.Size)}
							</p>
						</div>
					</div>
					<ItemMenu
						item={item}
						onView={onItemView}
						onDelete={onItemDelete}
						onRename={onItemRename}
						onPermissionChange={onItemPermissionChange}
						isDeletingItem={isDeletingItem}
					/>
				</Card>
			))}
		</div>
	);
}
