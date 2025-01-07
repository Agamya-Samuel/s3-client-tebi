'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useDropzone } from 'react-dropzone';
import { FolderPlus, Upload, ChevronRight, Loader2 } from 'lucide-react';
import { StorageItem } from '@/types/storage';
import * as storageActions from '@/app/actions/storage';
import { FileViewer } from './FileViewer';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	BreadcrumbNav,
	ViewModeSelector,
	UploadProgress,
	NewFolderDialog,
	RenameDialog,
	UploadDropzone,
	GridView,
	ListView,
	DetailView,
} from './components';
import { useFileUpload, useFileOperations, useViewMode } from './hooks';

declare module 'react' {
	interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
		webkitdirectory?: string;
		directory?: string;
	}
}

interface StorageExplorerProps {
	initialPath?: string;
}

export function StorageExplorer({ initialPath = '' }: StorageExplorerProps) {
	const router = useRouter();
	const [items, setItems] = useState<StorageItem[]>([]);
	const [currentPath, setCurrentPath] = useState(initialPath);
	const [loading, setLoading] = useState(false);
	const [selectedFile, setSelectedFile] = useState<StorageItem | null>(null);
	const [draggedOverFolder, setDraggedOverFolder] = useState<string | null>(
		null
	);
	const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
	const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
	const [itemToRename, setItemToRename] = useState<StorageItem | null>(null);

	const refreshItems = useCallback(async () => {
		try {
			const response = await storageActions.listItems(currentPath);
			setItems(response.items);
		} catch (error) {
			console.error('Error refreshing items:', error);
		}
	}, [currentPath]);

	const { viewMode, updateViewMode } = useViewMode();
	const { isUploading, uploadProgresses, handleFileDrop } = useFileUpload();
	const {
		isDeletingItem,
		handleDelete,
		handleRename,
		handlePermissionChange,
		handleCreateFolder,
	} = useFileOperations(refreshItems);

	const loadItems = useCallback(
		async (path: string) => {
			try {
				setLoading(true);
				const response = await storageActions.listItems(path);
				setItems(response.items);
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
				console.error('Error loading items:', error);
			} finally {
				setLoading(false);
			}
		},
		[router]
	);

	const handleFileClick = async (item: StorageItem) => {
		if (item.Type === 'file') {
			setSelectedFile(item);
		} else {
			loadItems(item.Key);
		}
	};

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
			const success = await handleFileDrop(files, folderKey);
			if (success) {
				await refreshItems();
			}
		}
	};

	const handleCreateFolderConfirm = async (folderName: string) => {
		const newFolderPath = `${currentPath}${folderName}`;
		const success = await handleCreateFolder(newFolderPath);
		if (success) {
			await refreshItems();
		}
	};

	const handleRenameConfirm = async (newName: string) => {
		if (!itemToRename) return;
		const success = await handleRename(
			itemToRename.Key,
			newName,
			itemToRename.Type
		);
		if (success) {
			await refreshItems();
		}
	};

	const handleItemRename = (item: StorageItem) => {
		setItemToRename(item);
		setIsRenameDialogOpen(true);
	};

	const handleItemPermissionChange = async (
		item: StorageItem,
		isPublic: boolean
	) => {
		const success = await handlePermissionChange(item, isPublic);
		if (success) {
			await refreshItems();
		}
	};

	// File upload dropzone configuration
	const { getRootProps: getFileRootProps, getInputProps: getFileInputProps } =
		useDropzone({
			onDrop: async (files) => {
				const success = await handleFileDrop(files);
				if (success) {
					await refreshItems();
				}
			},
			multiple: true,
			useFsAccessApi: false,
			noDragEventsBubbling: true,
			noClick: false,
		});

	const {
		getRootProps: getFolderRootProps,
		getInputProps: getFolderInputProps,
	} = useDropzone({
		onDrop: async (files) => {
			const success = await handleFileDrop(files);
			if (success) {
				await refreshItems();
			}
		},
		multiple: true,
		useFsAccessApi: false,
		noDragEventsBubbling: true,
		noClick: false,
	});

	// Initial load of bucket contents
	useEffect(() => {
		loadItems(initialPath);
	}, [initialPath, loadItems]);

	const renderView = () => {
		if (loading) {
			return (
				<div className="flex items-center justify-center h-[200px]">
					<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
				</div>
			);
		}

		const viewProps = {
			items,
			onItemClick: handleFileClick,
			onItemView: setSelectedFile,
			onItemDelete: handleDelete,
			onItemRename: handleItemRename,
			onItemPermissionChange: handleItemPermissionChange,
			isDeletingItem,
			draggedOverFolder,
			onFolderDragOver: handleFolderDragOver,
			onFolderDragLeave: handleFolderDragLeave,
			onFolderDrop: handleFolderDrop,
		};

		switch (viewMode) {
			case 'list':
				return <ListView {...viewProps} />;
			case 'detail':
				return <DetailView {...viewProps} />;
			default:
				return <GridView {...viewProps} />;
		}
	};

	return (
		<div className="p-4 space-y-4">
			<div className="flex flex-col items-start gap-4">
				<div className="flex flex-col w-full items-end">
					<div className="flex items-center gap-4">
						<ViewModeSelector
							viewMode={viewMode}
							onViewModeChange={updateViewMode}
						/>
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
											directory=""
											webkitdirectory=""
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
				<BreadcrumbNav
					currentPath={currentPath}
					loading={loading}
					onNavigate={loadItems}
				/>
			</div>

			<UploadProgress items={uploadProgresses} />

			{renderView()}

			<UploadDropzone
				onDrop={async (files) => {
					const success = await handleFileDrop(files);
					if (success) {
						await refreshItems();
					}
				}}
			/>

			{selectedFile && (
				<FileViewer
					item={selectedFile}
					isOpen={!!selectedFile}
					onClose={() => setSelectedFile(null)}
				/>
			)}

			<NewFolderDialog
				isOpen={isNewFolderDialogOpen}
				onClose={() => setIsNewFolderDialogOpen(false)}
				onConfirm={handleCreateFolderConfirm}
			/>

			<RenameDialog
				isOpen={isRenameDialogOpen}
				onClose={() => {
					setIsRenameDialogOpen(false);
					setItemToRename(null);
				}}
				onConfirm={handleRenameConfirm}
				item={itemToRename}
			/>
		</div>
	);
}
