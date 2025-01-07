'use client';

import { useState } from 'react';
import {
	MoreVertical,
	Eye,
	Pencil,
	Trash2,
	Globe2,
	Lock,
	Link,
	Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StorageItem } from '@/types/storage';
import * as storageActions from '@/app/actions/storage';
import { useToast } from '@/hooks/use-toast';

interface ItemMenuProps {
	item: StorageItem;
	onView: (item: StorageItem) => void;
	onDelete: (item: StorageItem) => void;
	onRename: (item: StorageItem) => void;
	onPermissionChange: (item: StorageItem, isPublic: boolean) => Promise<void>;
	isDeletingItem: string | null;
}

export function ItemMenu({
	item,
	onView,
	onDelete,
	onRename,
	onPermissionChange,
	isDeletingItem,
}: ItemMenuProps) {
	const [isUpdatingPermission, setIsUpdatingPermission] = useState(false);
	const [isCopying, setIsCopying] = useState(false);
	const { toast } = useToast();

	const handlePermissionChange = async () => {
		setIsUpdatingPermission(true);
		try {
			await onPermissionChange(item, !item.isPublic);
		} finally {
			setIsUpdatingPermission(false);
		}
	};

	const handleCopyUrl = async () => {
		setIsCopying(true);
		try {
			let url;
			if (item.Type === 'folder') {
				const pathSegments = item.Key.split('/').filter(Boolean);
				url = `${
					process.env.NEXT_PUBLIC_HOST
				}/storage/${pathSegments.join('/')}`;
			} else {
				url = await storageActions.getFileUrl(item.Key);
			}

			await navigator.clipboard.writeText(url);
			toast({
				title: 'Success',
				description: 'URL copied to clipboard',
				variant: 'success',
			});
		} catch (error) {
			console.error('Error copying URL:', error);
			toast({
				title: 'Error',
				description: 'Failed to copy URL',
				variant: 'destructive',
			});
		} finally {
			setIsCopying(false);
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
				<Button
					variant="ghost"
					size="icon"
					className="hover:bg-blue-100 hover:text-blue-700"
					disabled={
						isDeletingItem === item.Key ||
						isUpdatingPermission ||
						isCopying
					}
				>
					{isDeletingItem === item.Key ||
					isUpdatingPermission ||
					isCopying ? (
						<Loader2 className="h-4 w-4 animate-spin text-blue-600" />
					) : (
						<MoreVertical className="h-4 w-4 text-blue-600" />
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{item.Type === 'file' && (
					<>
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								onView(item);
							}}
							className="text-blue-600"
						>
							<Eye className="h-4 w-4 mr-2" />
							View
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={async (e) => {
								e.stopPropagation();
								await handlePermissionChange();
							}}
							className="text-blue-600"
							disabled={isUpdatingPermission}
						>
							{item.isPublic ? (
								<Lock className="h-4 w-4 mr-2" />
							) : (
								<Globe2 className="h-4 w-4 mr-2" />
							)}
							Make {item.isPublic ? 'Private' : 'Public'}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
					</>
				)}
				<DropdownMenuItem
					onClick={async (e) => {
						e.stopPropagation();
						await handleCopyUrl();
					}}
					className="text-blue-600"
					disabled={isCopying}
				>
					<Link className="h-4 w-4 mr-2" />
					Copy URL
				</DropdownMenuItem>
				{item.Type === 'file' && (
					<DropdownMenuItem
						onClick={(e) => {
							e.stopPropagation();
							onRename(item);
						}}
						className="text-blue-600"
					>
						<Pencil className="h-4 w-4 mr-2" />
						Rename
					</DropdownMenuItem>
				)}
				<DropdownMenuItem
					onClick={(e) => {
						e.stopPropagation();
						onDelete(item);
					}}
					className="text-red-600"
				>
					<Trash2 className="h-4 w-4 mr-2" />
					Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
