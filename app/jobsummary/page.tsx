"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Filter, Search } from "lucide-react";
import { wastZone, eastZone } from "@/data";
import ExpandableTable from "@/components/ExpandableTable";
import { DateRange } from "react-day-picker";
import FiltersForm from "@/components/filtersForm";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

const Page = () => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [filteredData, setFilteredData] = useState(wastZone);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [formData, setFormData] = useState({
    company: [{ value: "BMC", label: "BMC" }],
    branch: [{ value: "BMC", label: "BMC" }],
    town: [{ value: "BHAVNAGAR_OSC", label: "BHAVNAGAR_OSC" }],
    zone: { value: "All", label: "All" },
    ward: { value: "All", label: "All" },
  });
  const router = useRouter();

  // Comprehensive filtering function
  const applyFilters = () => {
    let result =
      formData.zone.value === "WEST_ZONE"
        ? [...wastZone]
        : formData.zone.value === "EAST_ZONE"
        ? [...eastZone]
        : [...wastZone, ...eastZone];

    // Filter by checked items
    if (checkedItems.length > 0) {
      result = result.filter((job) => checkedItems.includes(job["Job Name"]));
    }

    // Filter by job name search term
    if (searchTerm) {
      result = result.filter((job) =>
        job["Job Name"].toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by date range
    if (dateRange?.from && dateRange?.to) {
      result = result
        .map((job) => {
          // Filter more_details to only include entries within the date range
          const filteredMoreDetails = job.more_details.filter((detail) => {
            const jobDate = new Date(detail.Date);
            // @ts-ignore
            return jobDate >= dateRange.from && jobDate <= dateRange.to;
          });

          // Only return the job if it has matching more_details
          return filteredMoreDetails.length > 0
            ? { ...job, more_details: filteredMoreDetails }
            : null;
        })
        .filter(Boolean) as typeof result; // Remove null entries
    }
    // @ts-ignore
    setFilteredData(result);
  };

  // Apply filters when dependencies change
  useEffect(() => {
    applyFilters();
  }, [checkedItems, formData.zone, searchTerm, dateRange]);

  // Reset dependent fields when zone changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      ward: { value: "All", label: "All" },
    }));
    setCheckedItems([]);
  }, [formData.zone]);

  // Reset checked items when ward changes
  useEffect(() => {
    setCheckedItems([]);
  }, [formData.ward]);

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const handleFilterFormChange = (newFormData: typeof formData) => {
    setFormData(newFormData);
  };

  const handleCheckedItemsChange = (items: string[]) => {
    setCheckedItems(items);
  };

  return (
    <div className="relative min-h-screen w-full">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Job Summary</h1>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search Job Name"
                  className="border rounded px-2 py-1 pr-8 w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <Button variant="ghost" size="icon" onClick={toggleFilter}>
                <Filter className="h-4 w-4" />
                <span className="sr-only">Toggle filters</span>
              </Button>
              <Button
                onClick={() => {
                  Cookies.remove("isAuthenticated");
                  router.push("/");
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="mt-4">
          <ExpandableTable data={filteredData} />
        </div>
      </main>

      <div
        className={`fixed top-0 right-0 h-full bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          isFilterOpen ? "translate-x-0" : "translate-x-full"
        } z-20`}
      >
        <FiltersForm
          filteredData={filteredData}
          formData={formData}
          onClose={toggleFilter}
          onCheckedItemsChange={handleCheckedItemsChange}
          onFormDataChange={handleFilterFormChange}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </div>
    </div>
  );
};

export default Page;
