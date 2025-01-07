'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface NewFolderDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (folderName: string) => Promise<void>;
}

export function NewFolderDialog({
	isOpen,
	onClose,
	onConfirm,
}: NewFolderDialogProps) {
	const [folderName, setFolderName] = useState('');
	const [isCreating, setIsCreating] = useState(false);

	const handleCreate = async () => {
		if (!folderName.trim()) return;

		try {
			setIsCreating(true);
			await onConfirm(folderName);
			setFolderName('');
			onClose();
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create New Folder</DialogTitle>
				</DialogHeader>
				<div className="py-4">
					<Label htmlFor="folderName">Folder Name</Label>
					<Input
						id="folderName"
						value={folderName}
						onChange={(e) => setFolderName(e.target.value)}
						placeholder="Enter folder name"
						className="mt-2"
						autoFocus
						disabled={isCreating}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !isCreating) {
								handleCreate();
							}
						}}
					/>
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => {
							setFolderName('');
							onClose();
						}}
						disabled={isCreating}
					>
						Cancel
					</Button>
					<Button
						onClick={handleCreate}
						className="bg-blue-600 hover:bg-blue-700"
						disabled={isCreating}
					>
						{isCreating ? (
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
	);
}
