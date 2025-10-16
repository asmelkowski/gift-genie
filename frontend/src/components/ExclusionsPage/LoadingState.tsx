export function LoadingState() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="border rounded-lg p-4 bg-white animate-pulse"
        >
          <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
          <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
          <div className="h-9 bg-gray-200 rounded w-full" />
        </div>
      ))}
    </div>
  );
}
