import Loader from "@/shared/ui/Loader/Loader";

export default function Home() {
  return (
      <div className="flex flex-col items-center justify-center p-4 bg-gray-900 rounded-lg">
          <Loader variant="dots" size="lg" />
          <p className="text-white mt-2">Wave</p>
      </div>
  );
}
