'use client';

import { useState, useCallback, useEffect } from 'react';
import React from 'react';
import { useDropzone } from 'react-dropzone';
import {
	Loader2,
	Folder,
	Upload,
	FolderPlus,
	ArrowLeft,
	ChevronRight,
	Home,
	MoreVertical,
	Grid,
	List,
	Table,
	Eye,
	Pencil,
	Trash2,
	Globe2,
	Lock,
	Link,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { StorageItem } from '@/types/storage';
import {
	formatFileSize,
	sortItems,
	getParentPath,
	truncateName,
	getFileIcon,
} from '@/utils/storage';
import * as storageActions from '@/app/actions/storage';
import { FileViewer } from './FileViewer';
import { cn } from '@/lib/utils';

import { useRouter } from 'next/navigation';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface StorageExplorerProps {
	initialPath?: string;
}

const MAX_PATH_LIMIT = 4;

const FileIcon = ({
	fileName,
	className,
}: {
	fileName: string;
	className?: string;
}) => {
	const Icon = getFileIcon(fileName);
	return <Icon className={className} />;
};

interface ItemMenuProps {
	item: StorageItem;
	onView: (item: StorageItem) => void;
	onDelete: (item: StorageItem) => void;
	onRename: (item: StorageItem) => void;
	onPermissionChange: (item: StorageItem, isPublic: boolean) => Promise<void>;
	isDeletingItem: string | null;
}

function ItemMenu({
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
				// For folders, copy the path URL
				const pathSegments = item.Key.split('/').filter(Boolean);
				url = `/storage/${pathSegments.join('/')}`;
			} else {
				// For files, get the appropriate URL (public or private)
				url = await storageActions.getFileUrl(item.Key);
			}

			await navigator.clipboard.writeText(url);
			toast({
				title: 'Success',
				description: 'URL copied to clipboard',
				variant: 'success',
			});
		} catch (error) {
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

interface UploadProgress {
	fileName: string;
	progress: number;
}

export function StorageExplorer({ initialPath = '' }: StorageExplorerProps) {
	const router = useRouter();
	const [items, setItems] = useState<StorageItem[]>([]);
	const [currentPath, setCurrentPath] = useState(initialPath);
	const [loading, setLoading] = useState(false);
	const [uploadProgresses, setUploadProgresses] = useState<UploadProgress[]>(
		[]
	);
	const [isUploading, setIsUploading] = useState(false);
	const [selectedFile, setSelectedFile] = useState<StorageItem | null>(null);
	const [draggedOverFolder, setDraggedOverFolder] = useState<string | null>(
		null
	);
	const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
	const [newFolderName, setNewFolderName] = useState('');
	const [isCreatingFolder, setIsCreatingFolder] = useState(false);
	const [isDeletingItem, setIsDeletingItem] = useState<string | null>(null);
	const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
	const [itemToRename, setItemToRename] = useState<StorageItem | null>(null);
	const [newName, setNewName] = useState('');
	const [isRenaming, setIsRenaming] = useState(false);
	const [viewMode, setViewMode] = useState<'grid' | 'list' | 'detail'>(
		'grid'
	);
	const { toast } = useToast();

	const loadItems = useCallback(
		async (path: string) => {
			try {
				setLoading(true);
				const response = await storageActions.listItems(path);
				setItems(sortItems(response.items));
				setCurrentPath(path);

				// Update URL after state updates
				const urlPath =
					path === ''
						? '/storage'
						: `/storage/${path
								.split('/')
								.filter(Boolean)
								.join('/')}`;
				router.replace(urlPath, { scroll: false });
			} catch (error: unknown) {
				toast({
					title: 'Error',
					description:
						error instanceof Error
							? error.message
							: 'Failed to load items',
					variant: 'destructive',
				});
			} finally {
				setLoading(false);
			}
		},
		[router, toast]
	);

	const refreshItems = useCallback(async () => {
		try {
			const response = await storageActions.listItems(currentPath);
			setItems(sortItems(response.items));
		} catch (error) {
			console.error('Error refreshing items:', error);
		}
	}, [currentPath]);

	const handleFileDrop = useCallback(
		async (files: File[], targetFolder?: string) => {
			try {
				setIsUploading(true);
				setUploadProgresses(
					files.map((file) => ({ fileName: file.name, progress: 0 }))
				);

				// Group files by their folder structure
				const filesByFolder = new Map<string, File[]>();
				for (const file of files) {
					const relativePath = file.webkitRelativePath || file.name;
					const pathParts = relativePath.split('/');

					if (pathParts.length > 1) {
						// This is a file inside a folder
						const folderPath =
							pathParts.slice(0, -1).join('/') + '/';
						const existingFiles =
							filesByFolder.get(folderPath) || [];
						filesByFolder.set(folderPath, [...existingFiles, file]);
					} else {
						// This is a root file
						const existingFiles = filesByFolder.get('') || [];
						filesByFolder.set('', [...existingFiles, file]);
					}
				}

				// Create folders and upload files
				let fileIndex = 0;
				let successCount = 0;
				for (const [
					folderPath,
					folderFiles,
				] of filesByFolder.entries()) {
					if (folderPath) {
						// Create the folder structure
						const basePath = targetFolder || currentPath;
						const fullFolderPath = `${basePath}${folderPath}`;

						try {
							await storageActions.createFolder(fullFolderPath);
						} catch (error) {
							console.error(
								`Error creating folder ${fullFolderPath}:`,
								error
							);
							// Continue even if folder creation fails (might already exist)
						}
					}

					// Upload files in this folder
					for (const file of folderFiles) {
						try {
							const basePath = targetFolder || currentPath;
							const key = folderPath
								? `${basePath}${folderPath}${file.name}`
								: `${basePath}${file.name}`;

							// Start with 0% progress
							setUploadProgresses((prev) =>
								prev.map((p, idx) =>
									idx === fileIndex
										? { ...p, progress: 0 }
										: p
								)
							);

							await storageActions.uploadFile(file, key);
							successCount++;

							// Set to 100% when complete
							setUploadProgresses((prev) =>
								prev.map((p, idx) =>
									idx === fileIndex
										? { ...p, progress: 100 }
										: p
								)
							);
						} catch (error: unknown) {
							toast({
								title: 'Error',
								description:
									error instanceof Error
										? error.message
										: `Failed to upload ${file.name}`,
								variant: 'destructive',
							});
						}
						fileIndex++;
					}
				}

				await refreshItems();

				// Only show success toast if at least one file was uploaded successfully
				if (successCount > 0) {
					toast({
						title: 'Success',
						description:
							successCount === 1
								? 'File uploaded successfully'
								: `${successCount} files uploaded successfully`,
						variant: 'success',
					});
				}
			} catch (error: unknown) {
				toast({
					title: 'Error',
					description:
						error instanceof Error
							? error.message
							: 'Failed to upload files',
					variant: 'destructive',
				});
			} finally {
				setIsUploading(false);
				setUploadProgresses([]);
			}
		},
		[currentPath, refreshItems, setIsUploading, setUploadProgresses, toast]
	);

	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			handleFileDrop(acceptedFiles);
		},
		[handleFileDrop]
	);

	// Update the dropzone configurations
	const {
		getRootProps: getMainDropzoneProps,
		getInputProps: getMainInputProps,
		isDragActive,
	} = useDropzone({
		onDrop,
		noClick: true,
		noDrag: false,
		noKeyboard: false,
		multiple: true,
		useFsAccessApi: false,
	});

	// Separate dropzones for files and folders
	const { getRootProps: getFileRootProps, getInputProps: getFileInputProps } =
		useDropzone({
			onDrop,
			multiple: true,
			useFsAccessApi: false,
			noDragEventsBubbling: true,
			noClick: false,
		});

	const {
		getRootProps: getFolderRootProps,
		getInputProps: getFolderInputProps,
	} = useDropzone({
		onDrop,
		multiple: true,
		useFsAccessApi: false,
		noDragEventsBubbling: true,
		noClick: false,
	});

	const handleDelete = async (item: StorageItem) => {
		try {
			setIsDeletingItem(item.Key);
			// Optimistic update - remove file from the list immediately
			setItems((prev) => prev.filter((i) => i.Key !== item.Key));

			const response = await storageActions.deleteItem(item.Key);

			if (response.success) {
				toast({
					title: 'Success',
					description: 'Item deleted successfully',
					variant: 'success',
				});
			}
		} catch (error) {
			// Revert optimistic update on error
			const updatedList = await storageActions.listItems(currentPath);
			setItems(sortItems(updatedList.items));
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

	const handleCreateFolder = async () => {
		if (!newFolderName.trim()) return;

		try {
			setIsCreatingFolder(true);
			const newFolderPath = `${currentPath}${newFolderName}`;

			// Optimistic update - add folder to the list immediately
			const optimisticFolder: StorageItem = {
				Key: `${newFolderPath}/`,
				LastModified: new Date(),
				Size: 0,
				Type: 'folder',
			};
			setItems((prev) => sortItems([...prev, optimisticFolder]));

			const response = await storageActions.createFolder(newFolderPath);

			if (response.success) {
				toast({
					title: 'Success',
					description: 'Folder created successfully',
					variant: 'success',
				});
				setNewFolderName('');
				setIsNewFolderDialogOpen(false);
			}
		} catch (error) {
			// Revert optimistic update on error
			const updatedList = await storageActions.listItems(currentPath);
			setItems(sortItems(updatedList.items));
			toast({
				title: 'Error',
				description:
					error instanceof Error
						? error.message
						: 'Failed to create folder',
				variant: 'destructive',
			});
		} finally {
			setIsCreatingFolder(false);
		}
	};

	const handleFileClick = async (item: StorageItem) => {
		if (item.Type === 'file') {
			setSelectedFile(item);
		} else {
			// For folders, load their contents
			loadItems(item.Key);
		}
	};

	const navigateUp = () => {
		const parentPath = getParentPath(currentPath);
		loadItems(parentPath);
	};

	// Initial load of bucket contents
	useEffect(() => {
		loadItems(initialPath);
	}, [initialPath, loadItems]);

	const handleFolderDragOver = (e: React.DragEvent, folderKey: string) => {
		e.preventDefault();
		e.stopPropagation();
		setDraggedOverFolder(folderKey);
	};

	const handleFolderDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDraggedOverFolder(null);
	};

	const handleFolderDrop = async (e: React.DragEvent, folderKey: string) => {
		e.preventDefault();
		e.stopPropagation();
		setDraggedOverFolder(null);

		const files = Array.from(e.dataTransfer.files);
		if (files.length > 0) {
			await handleFileDrop(files, folderKey);
		}
	};

	const renderBreadcrumbs = () => {
		const pathSegments = currentPath.split('/').filter(Boolean);
		const isPathTruncated = pathSegments.length > MAX_PATH_LIMIT;
		const displayedSegments = isPathTruncated
			? pathSegments.slice(pathSegments.length - MAX_PATH_LIMIT)
			: pathSegments;
		const hiddenSegments = isPathTruncated
			? pathSegments.slice(0, pathSegments.length - MAX_PATH_LIMIT)
			: [];

		return (
			<div className="flex items-center gap-1 text-sm">
				<Button
					variant="ghost"
					size="icon"
					className="hover:bg-blue-100 hover:text-blue-700"
					onClick={() => loadItems('')}
				>
					<Home className="h-4 w-4 text-blue-600" />
				</Button>
				{isPathTruncated && (
					<>
						<ChevronRight className="h-4 w-4 text-blue-600" />
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									className="hover:bg-blue-100 hover:text-blue-700 px-2"
								>
									<span className="text-blue-600">...</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								{hiddenSegments.map((segment, index) => {
									const pathToHere =
										pathSegments
											.slice(0, index + 1)
											.join('/') + '/';
									return (
										<DropdownMenuItem
											key={pathToHere}
											onClick={() =>
												loadItems(pathToHere)
											}
											className="text-blue-600"
										>
											{segment}
										</DropdownMenuItem>
									);
								})}
							</DropdownMenuContent>
						</DropdownMenu>
					</>
				)}
				{displayedSegments.map((segment, index) => (
					<React.Fragment key={segment}>
						<ChevronRight className="h-4 w-4 text-blue-600" />
						<Button
							variant="ghost"
							className="hover:bg-blue-100 hover:text-blue-700"
							onClick={() => {
								const targetPath = isPathTruncated
									? pathSegments
											.slice(
												0,
												pathSegments.length -
													MAX_PATH_LIMIT +
													index +
													1
											)
											.join('/') + '/'
									: pathSegments
											.slice(0, index + 1)
											.join('/') + '/';
								loadItems(targetPath);
							}}
						>
							{segment}
						</Button>
					</React.Fragment>
				))}
			</div>
		);
	};

	const handleRename = async () => {
		if (!itemToRename || !newName.trim()) return;

		try {
			setIsRenaming(true);
			const oldPath = itemToRename.Key;
			const parentPath = getParentPath(oldPath);
			const newPath = `${parentPath}${newName}${
				itemToRename.Type === 'folder' ? '/' : ''
			}`;

			// Optimistic update
			setItems((prev) =>
				prev.map((item) =>
					item.Key === oldPath ? { ...item, Key: newPath } : item
				)
			);

			const response = await storageActions.renameItem(oldPath, newPath);

			if (response.success) {
				toast({
					title: 'Success',
					description: 'Item renamed successfully',
					variant: 'success',
				});
				setNewName('');
				setItemToRename(null);
				setIsRenameDialogOpen(false);
			}
		} catch (error) {
			// Revert optimistic update on error
			const updatedList = await storageActions.listItems(currentPath);
			setItems(sortItems(updatedList.items));
			toast({
				title: 'Error',
				description: `Failed to rename item: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
				variant: 'destructive',
				duration: 5000,
			});
		} finally {
			setIsRenaming(false);
		}
	};

	const handleItemRename = (item: StorageItem) => {
		setItemToRename(item);
		const currentName = item.Key.split('/').filter(Boolean).pop() || '';
		setNewName(currentName.replace(/\/$/, ''));
		setIsRenameDialogOpen(true);
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
			setItems((prev) =>
				prev.map((i) =>
					i.Key === item.Key
						? { ...i, isPublic: response.isPublic }
						: i
				)
			);
			toast({
				title: 'Success',
				description: response.message,
				variant: 'success',
			});
		} catch (error) {
			toast({
				title: 'Error',
				description:
					error instanceof Error
						? error.message
						: 'Failed to update file access',
				variant: 'destructive',
			});
		}
	};

	const handleToggleAccess = async (item: StorageItem) => {
		try {
			const response = await storageActions.setFilePermission(
				item.Key,
				!item.isPublic
			);
			// Update the item in the list
			setItems((prev) =>
				prev.map((i) =>
					i.Key === item.Key
						? { ...i, isPublic: response.isPublic }
						: i
				)
			);
			toast({
				title: 'Success',
				description: response.message,
				variant: 'success',
			});
		} catch (error) {
			toast({
				title: 'Error',
				description:
					error instanceof Error
						? error.message
						: 'Failed to update file access',
				variant: 'destructive',
			});
		}
	};

	const renderItems = () => {
		if (loading) {
			return (
				<div className="flex items-center justify-center h-[200px]">
					<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
				</div>
			);
		}

		if (viewMode === 'list') {
			return (
				<div className="flex flex-col gap-2">
					{items.map((item) => (
						<Card
							key={item.Key}
							className={cn(
								'p-3 flex items-center justify-between cursor-pointer border-blue-200',
								item.Type === 'folder' &&
									draggedOverFolder === item.Key
									? 'bg-blue-100 border-blue-400 border-dashed'
									: 'hover:bg-blue-50'
							)}
							onClick={() => handleFileClick(item)}
							onDragOver={
								item.Type === 'folder'
									? (e) => handleFolderDragOver(e, item.Key)
									: undefined
							}
							onDragLeave={
								item.Type === 'folder'
									? handleFolderDragLeave
									: undefined
							}
							onDrop={
								item.Type === 'folder'
									? (e) => handleFolderDrop(e, item.Key)
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
												handleToggleAccess(item);
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
									onView={setSelectedFile}
									onDelete={handleDelete}
									onRename={handleItemRename}
									onPermissionChange={handlePermissionChange}
									isDeletingItem={isDeletingItem}
								/>
							</div>
						</Card>
					))}
				</div>
			);
		}

		if (viewMode === 'detail') {
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
									onClick={() => handleFileClick(item)}
									onDragOver={
										item.Type === 'folder'
											? (e) =>
													handleFolderDragOver(
														e,
														item.Key
													)
											: undefined
									}
									onDragLeave={
										item.Type === 'folder'
											? handleFolderDragLeave
											: undefined
									}
									onDrop={
										item.Type === 'folder'
											? (e) =>
													handleFolderDrop(
														e,
														item.Key
													)
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
														: item.Key.split(
																'/'
														  ).pop() || ''
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
										{new Date(
											item.LastModified
										).toLocaleString()}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-right">
										<ItemMenu
											item={item}
											onView={setSelectedFile}
											onDelete={handleDelete}
											onRename={handleItemRename}
											onPermissionChange={
												handlePermissionChange
											}
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

		// Default grid view
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
				{items.map((item) => (
					<Card
						key={item.Key}
						className={cn(
							'p-4 flex items-center justify-between cursor-pointer border-blue-200',
							item.Type === 'folder' &&
								draggedOverFolder === item.Key
								? 'bg-blue-100 border-blue-400 border-dashed'
								: 'hover:bg-blue-50'
						)}
						onClick={() => handleFileClick(item)}
						onDragOver={
							item.Type === 'folder'
								? (e) => handleFolderDragOver(e, item.Key)
								: undefined
						}
						onDragLeave={
							item.Type === 'folder'
								? handleFolderDragLeave
								: undefined
						}
						onDrop={
							item.Type === 'folder'
								? (e) => handleFolderDrop(e, item.Key)
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
							onView={setSelectedFile}
							onDelete={handleDelete}
							onRename={handleItemRename}
							onPermissionChange={handlePermissionChange}
							isDeletingItem={isDeletingItem}
						/>
					</Card>
				))}
			</div>
		);
	};

	return (
		<div className="p-4 space-y-4">
			<div className="flex flex-col items-start gap-4">
				<div className="flex flex-col w-full items-end">
					<div className="flex items-center gap-4">
						<div className="flex gap-1 border border-blue-200 rounded-lg p-1">
							<Button
								variant="ghost"
								size="sm"
								className={cn(
									'hover:bg-blue-50 hover:text-blue-600',
									viewMode === 'grid' &&
										'bg-blue-50 text-blue-600'
								)}
								onClick={() => setViewMode('grid')}
							>
								<Grid className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								className={cn(
									'hover:bg-blue-50 hover:text-blue-600',
									viewMode === 'list' &&
										'bg-blue-50 text-blue-600'
								)}
								onClick={() => setViewMode('list')}
							>
								<List className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								className={cn(
									'hover:bg-blue-50 hover:text-blue-600',
									viewMode === 'detail' &&
										'bg-blue-50 text-blue-600'
								)}
								onClick={() => setViewMode('detail')}
							>
								<Table className="h-4 w-4" />
							</Button>
						</div>
						<div className="flex gap-2">
							<Button
								onClick={() => setIsNewFolderDialogOpen(true)}
								className="bg-blue-600 hover:bg-blue-700"
								disabled={loading}
							>
								<FolderPlus className="h-4 w-4 mr-2" />
								New Folder
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										className="bg-blue-600 hover:bg-blue-700"
										disabled={loading || isUploading}
									>
										{isUploading ? (
											<>
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
												Uploading...
											</>
										) : (
											<>
												<Upload className="h-4 w-4 mr-2" />
												Upload
												<ChevronRight className="h-4 w-4 ml-2" />
											</>
										)}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<div {...getFileRootProps()}>
										<input {...getFileInputProps()} />
										<DropdownMenuItem
											className="cursor-pointer"
											onSelect={(e) => e.preventDefault()}
										>
											<Upload className="h-4 w-4 mr-2" />
											Upload Files
										</DropdownMenuItem>
									</div>
									<div {...getFolderRootProps()}>
										<input
											{...getFolderInputProps()}
											// @ts-ignore
											webkitdirectory="true"
											type="file"
										/>
										<DropdownMenuItem
											className="cursor-pointer"
											onSelect={(e) => e.preventDefault()}
										>
											<FolderPlus className="h-4 w-4 mr-2" />
											Upload Folder
										</DropdownMenuItem>
									</div>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2 w-full border border-blue-200 rounded-lg p-1">
					{currentPath && (
						<Button
							variant="outline"
							size="icon"
							onClick={navigateUp}
							className="hover:bg-blue-50 hover:text-blue-600 border-blue-200"
							disabled={loading}
						>
							{loading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<ArrowLeft className="h-4 w-4" />
							)}
						</Button>
					)}
					{renderBreadcrumbs()}
				</div>
			</div>

			{uploadProgresses.length > 0 && (
				<div className="space-y-2">
					{uploadProgresses.map((progress, index) => (
						<div key={index} className="space-y-1">
							<div className="flex justify-between text-sm text-gray-600">
								<span>{progress.fileName}</span>
								<span>{progress.progress.toFixed(0)}%</span>
							</div>
							<Progress
								value={progress.progress}
								className="w-full bg-blue-100"
							/>
						</div>
					))}
				</div>
			)}

			{renderItems()}

			{/* Dedicated dropzone area */}
			<div
				{...getMainDropzoneProps()}
				className={cn(
					'border-2 border-dashed rounded-lg p-8 transition-colors',
					isDragActive
						? 'border-blue-600 bg-blue-50/50 backdrop-blur-sm'
						: 'border-blue-200 hover:border-blue-400',
					'flex flex-col items-center justify-center gap-4'
				)}
			>
				<Upload
					className={cn(
						'h-8 w-8',
						isDragActive ? 'text-blue-600' : 'text-blue-400'
					)}
				/>
				<div className="text-center">
					<p
						className={cn(
							'text-lg font-medium',
							isDragActive ? 'text-blue-600' : 'text-blue-400'
						)}
					>
						{isDragActive
							? 'Drop files here'
							: 'Drag and drop files here'}
					</p>
					<p className="text-sm text-blue-400 mt-1">
						or click the Upload Files button above
					</p>
				</div>
				<input {...getMainInputProps()} />
			</div>

			{selectedFile && (
				<FileViewer
					item={selectedFile}
					isOpen={!!selectedFile}
					onClose={() => setSelectedFile(null)}
				/>
			)}

			<Dialog
				open={isNewFolderDialogOpen}
				onOpenChange={setIsNewFolderDialogOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create New Folder</DialogTitle>
					</DialogHeader>
					<div className="py-4">
						<Label htmlFor="folderName">Folder Name</Label>
						<Input
							id="folderName"
							value={newFolderName}
							onChange={(e) => setNewFolderName(e.target.value)}
							placeholder="Enter folder name"
							className="mt-2"
							autoFocus
							disabled={isCreatingFolder}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !isCreatingFolder) {
									handleCreateFolder();
								}
							}}
						/>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setNewFolderName('');
								setIsNewFolderDialogOpen(false);
							}}
							disabled={isCreatingFolder}
						>
							Cancel
						</Button>
						<Button
							onClick={handleCreateFolder}
							className="bg-blue-600 hover:bg-blue-700"
							disabled={isCreatingFolder}
						>
							{isCreatingFolder ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Creating...
								</>
							) : (
								'Create'
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={isRenameDialogOpen}
				onOpenChange={setIsRenameDialogOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Rename {itemToRename?.Type}</DialogTitle>
					</DialogHeader>
					<div className="py-4">
						<Label htmlFor="newName">New Name</Label>
						<Input
							id="newName"
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							placeholder="Enter new name"
							className="mt-2"
							autoFocus
							disabled={isRenaming}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !isRenaming) {
									handleRename();
								}
							}}
						/>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setNewName('');
								setItemToRename(null);
								setIsRenameDialogOpen(false);
							}}
							disabled={isRenaming}
						>
							Cancel
						</Button>
						<Button
							onClick={handleRename}
							className="bg-blue-600 hover:bg-blue-700"
							disabled={isRenaming}
						>
							{isRenaming ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Renaming...
								</>
							) : (
								'Rename'
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
