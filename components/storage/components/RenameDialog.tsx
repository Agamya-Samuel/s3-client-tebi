'use client';

import { useState, useEffect } from 'react';
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
import { StorageItem } from '@/types/storage';

interface RenameDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (newName: string) => Promise<void>;
	item: StorageItem | null;
}

export function RenameDialog({
	isOpen,
	onClose,
	onConfirm,
	item,
}: RenameDialogProps) {
	const [newName, setNewName] = useState('');
	const [isRenaming, setIsRenaming] = useState(false);

	useEffect(() => {
		if (item) {
			const currentName = item.Key.split('/').filter(Boolean).pop() || '';
			setNewName(currentName.replace(/\/$/, ''));
		}
	}, [item]);

	const handleRename = async () => {
		if (!newName.trim()) return;

		try {
			setIsRenaming(true);
			await onConfirm(newName);
			setNewName('');
			onClose();
		} finally {
			setIsRenaming(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Rename {item?.Type}</DialogTitle>
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
							onClose();
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
	);
}
