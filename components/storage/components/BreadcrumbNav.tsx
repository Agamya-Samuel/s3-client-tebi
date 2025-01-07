'use client';

import React from 'react';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Home, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';

interface BreadcrumbNavProps {
	currentPath: string;
	loading: boolean;
	onNavigate: (path: string) => void;
}

const MAX_PATH_LIMIT = 3;

export function BreadcrumbNav({
	currentPath,
	loading,
	onNavigate,
}: BreadcrumbNavProps) {
	const pathSegments = currentPath.split('/').filter(Boolean);
	const isPathTruncated = pathSegments.length > MAX_PATH_LIMIT;
	const displayedSegments = isPathTruncated
		? pathSegments.slice(pathSegments.length - MAX_PATH_LIMIT)
		: pathSegments;
	const hiddenSegments = isPathTruncated
		? pathSegments.slice(0, pathSegments.length - MAX_PATH_LIMIT)
		: [];

	return (
		<div className="flex items-center gap-2 w-full border border-blue-200 rounded-lg p-1">
			{currentPath && (
				<Button
					variant="outline"
					size="icon"
					onClick={() =>
						onNavigate(
							currentPath.split('/').slice(0, -2).join('/') + '/'
						)
					}
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
			<div className="flex items-center gap-1 text-sm">
				<Button
					variant="ghost"
					size="icon"
					className="hover:bg-blue-100 hover:text-blue-700"
					onClick={() => onNavigate('')}
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
												onNavigate(pathToHere)
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
								onNavigate(targetPath);
							}}
						>
							{segment}
						</Button>
					</React.Fragment>
				))}
			</div>
		</div>
	);
}
