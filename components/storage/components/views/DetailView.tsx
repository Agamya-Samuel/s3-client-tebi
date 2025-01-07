'use client';

import { Folder } from 'lucide-react';
import { StorageItem } from '@/types/storage';
import { FileIcon } from '../FileIcon';
import { ItemMenu } from '../ItemMenu';
import { cn } from '@/lib/utils';
import { formatFileSize, truncateName } from '@/utils/storage';

interface DetailViewProps {
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

export function DetailView({
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
}: DetailViewProps) {
	return (
		<div className="overflow-hidden border border-blue-200 rounded-lg">
			<table className="min-w-full divide-y divide-blue-200">
				<thead className="bg-blue-50">
					<tr>
						<th className="px-6 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">
							Name
						</th>
						<th className="px-6 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">
							Type
						</th>
						<th className="px-6 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">
							Size
						</th>
						<th className="px-6 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">
							Modified
						</th>
						<th className="px-6 py-3 text-right text-xs font-medium text-blue-600 uppercase tracking-wider">
							Actions
						</th>
					</tr>
				</thead>
				<tbody className="bg-white divide-y divide-blue-200">
					{items.map((item) => (
						<tr
							key={item.Key}
							className={cn(
								'hover:bg-blue-50 cursor-pointer',
								item.Type === 'folder' &&
									draggedOverFolder === item.Key
									? 'bg-blue-100'
									: ''
							)}
							onClick={() => onItemClick(item)}
							onDragOver={
								item.Type === 'folder'
									? (e) => onFolderDragOver(e, item.Key)
									: undefined
							}
							onDragLeave={
								item.Type === 'folder'
									? onFolderDragLeave
									: undefined
							}
							onDrop={
								item.Type === 'folder'
									? (e) => onFolderDrop(e, item.Key)
									: undefined
							}
						>
							<td className="px-6 py-4 whitespace-nowrap">
								<div className="flex items-center">
									{item.Type === 'folder' ? (
										<Folder className="h-5 w-5 text-blue-600 mr-3" />
									) : (
										<FileIcon
											fileName={item.Key}
											className="h-5 w-5 text-blue-600 mr-3"
										/>
									)}
									<span className="font-medium text-blue-900">
										{truncateName(
											item.Type === 'folder'
												? item.Key.split('/')
														.filter(Boolean)
														.slice(-1)[0] ||
														item.Key
												: item.Key.split('/').pop() ||
														''
										)}
									</span>
								</div>
							</td>
							<td className="px-6 py-4 whitespace-nowrap">
								<span className="text-sm text-blue-600 capitalize">
									{item.Type}
								</span>
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-blue-500">
								{item.Type === 'file'
									? formatFileSize(item.Size)
									: '-'}
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-blue-500">
								{new Date(item.LastModified).toLocaleString()}
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-right">
								<ItemMenu
									item={item}
									onView={onItemView}
									onDelete={onItemDelete}
									onRename={onItemRename}
									onPermissionChange={onItemPermissionChange}
									isDeletingItem={isDeletingItem}
								/>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
