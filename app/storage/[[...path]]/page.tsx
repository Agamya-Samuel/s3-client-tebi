import { Suspense } from 'react';
import { use } from 'react';
import { StorageExplorer } from '@/components/storage/StorageExplorer';
import { Toaster } from '@/components/ui/toaster';

interface StoragePageProps {
	params: Promise<{
		path?: string[];
	}>;
}

function StorageContent({ path }: { path?: string[] }) {
	'use client';

	const currentPath = path ? `${path.join('/')}/` : '';

	return (
		<div className="container mx-auto py-8">
			<h1 className="text-3xl font-bold mb-8 text-blue-600">
				Tebi Cloud Storage
			</h1>
			<StorageExplorer initialPath={currentPath} />
			<Toaster />
		</div>
	);
}

export default function StoragePage({ params }: StoragePageProps) {
	const resolvedParams = use(params);

	return (
		<main className="min-h-screen bg-blue-50">
			<Suspense
				fallback={
					<div className="flex items-center justify-center h-screen">
						<div className="text-blue-600 text-xl">Loading...</div>
					</div>
				}
			>
				<StorageContent path={resolvedParams.path} />
			</Suspense>
		</main>
	);
}
