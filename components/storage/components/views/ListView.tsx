'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Folder, Globe2, Lock } from 'lucide-react';
import { StorageItem } from '@/types/storage';
import { FileIcon } from '../FileIcon';
import { ItemMenu } from '../ItemMenu';
import { cn } from '@/lib/utils';
import { formatFileSize, truncateName } from '@/utils/storage';

interface ListViewProps {
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

export function ListView({
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
}: ListViewProps) {
	return (
		<div className="flex flex-col gap-2">
			{items.map((item) => (
				<Card
					key={item.Key}
					className={cn(
						'p-3 flex items-center justify-between cursor-pointer border-blue-200',
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
					<div className="flex items-center gap-4 flex-1">
						{item.Type === 'folder' ? (
							<Folder className="h-5 w-5 text-blue-600" />
						) : (
							<FileIcon
								fileName={item.Key}
								className="h-5 w-5 text-blue-600"
							/>
						)}
						<span className="font-medium text-blue-900">
							{truncateName(
								item.Type === 'folder'
									? item.Key.split('/')
											.filter(Boolean)
											.slice(-1)[0] || item.Key
									: item.Key.split('/').pop() || ''
							)}
						</span>
					</div>
					<div className="flex items-center gap-4">
						{item.Type === 'file' && (
							<span className="text-sm text-blue-500">
								{formatFileSize(item.Size)}
							</span>
						)}
						<div className="flex-1 min-w-[100px]">
							{item.Type === 'file' && (
								<Button
									variant="ghost"
									size="sm"
									className="gap-2"
									onClick={(e) => {
										e.stopPropagation();
										onItemPermissionChange(
											item,
											!item.isPublic
										);
									}}
								>
									{item.isPublic ? (
										<>
											<Globe2 className="h-4 w-4 text-green-600" />
											<span className="text-green-600">
												Public
											</span>
										</>
									) : (
										<>
											<Lock className="h-4 w-4 text-gray-600" />
											<span>Private</span>
										</>
									)}
								</Button>
							)}
						</div>
						<ItemMenu
							item={item}
							onView={onItemView}
							onDelete={onItemDelete}
							onRename={onItemRename}
							onPermissionChange={onItemPermissionChange}
							isDeletingItem={isDeletingItem}
						/>
					</div>
				</Card>
			))}
		</div>
	);
}
