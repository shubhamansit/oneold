"use client";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Filter, Search } from "lucide-react";
import {getWastZone, getEastZone, getGeneral, BRIGRAJSINH} from "@/data/index";
import ExpandableTable from "@/components/ExpandableTable";
import { DateRange } from "react-day-picker";
import FiltersForm from "@/components/filtersForm";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

const Page = () => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load data dynamically
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [wastZoneData, eastZoneData, generalData] = await Promise.all([
          getWastZone(),
          getEastZone(),
          getGeneral()
        ]);
        
        const allData = [...wastZoneData, ...eastZoneData, ...generalData];
        setFilteredData(allData);
        
        // Debug: Log loaded data
        console.log('Data loaded successfully:', {
          wastZone: wastZoneData.length,
          eastZone: eastZoneData.length, 
          general: generalData.length,
          total: allData.length
        });
        
        // Debug: Check for GJ06BX0741 in loaded data
        const gj0741Entries = allData.filter(job => 
          job.more_details?.some(detail => 
            detail.Vehicle?.includes('GJ06BX0741') || detail.Vehicle?.includes('GJ 06 BX 0741')
          )
        );
        console.log('GJ06BX0741 entries in loaded data:', gj0741Entries.length);
        
      } catch (error) {
        console.error('Error loading data:', error);
        setFilteredData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [formData, setFormData] = useState({
    company: [{ value: "BMC", label: "BMC" }],
    branch: [{ value: "BMC", label: "BMC" }],
    town: { value: "BHAVNAGAR_OSC", label: "BHAVNAGAR_OSC" },
    zone: { value: "All", label: "All" },
    ward: { value: "All", label: "All" },
  });
  const router = useRouter();

  // Comprehensive filtering function
  const applyFilters = () => {
    try {
      console.log('applyFilters called with:', { 
        checkedItems: checkedItems.length, 
        searchTerm, 
        vehicleSearchTerm, 
        dateRange,
        zone: formData.zone.value 
      });
      
      let result;
    // Updated zone filtering logic to include general zone
    if (formData.town.value == "BRIGRAJSINH") {
      result = BRIGRAJSINH;
    } else {
      switch (formData.zone.value) {
        case "WEST_ZONE":
          result = [...wastZone];
          break;
        case "EAST_ZONE":
          result = [...eastZone];
          break;
        case "GENERAL":
          result = [...general];
          break;
        default:
          result = [...wastZone, ...eastZone, ...general];
      }
    }

    // Filter by checked items
    if (checkedItems.length > 0) {
      result = result.filter((job) => checkedItems.includes(job["Job Name"]));
    }

    // Filter by job name search term
    if (searchTerm) {
      result = result.filter((job) =>
        job["Job Name"].toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Filter by vehicle search term
    if (vehicleSearchTerm) {
      console.log('Searching for vehicle:', vehicleSearchTerm);
      const beforeCount = result.length;
      
      result = result.filter((job) => {
        // Check if more_details exists and is an array
        if (!job.more_details || !Array.isArray(job.more_details)) {
          return false;
        }
        const hasMatch = job.more_details.some((detail) => {
          const vehicleName = detail.Vehicle?.toLowerCase() || '';
          const searchTerm = vehicleSearchTerm.toLowerCase();
          const matches = vehicleName.includes(searchTerm);
          if (matches) {
            console.log('Found match:', detail.Vehicle, 'for search term:', vehicleSearchTerm);
          }
          return matches;
        });
        return hasMatch;
      });
      
      console.log(`Vehicle search: ${beforeCount} -> ${result.length} results`);
    }

    // Date range filter
    if (dateRange?.from && dateRange?.to) {
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);

      // Set the time to start of day for fromDate and end of day for toDate
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);


      result = result
        .map((job) => {
          // Check if more_details exists and is an array
          if (!job.more_details || !Array.isArray(job.more_details)) {
            return null;
          }
          
          const filteredMoreDetails = job.more_details.filter((detail) => {
            const jobDate = new Date(detail.Date);
            // Set the time to noon to avoid timezone issues
            jobDate.setHours(12, 0, 0, 0);

            return jobDate >= fromDate && jobDate <= toDate;
          });

          return filteredMoreDetails.length > 0
            ? { ...job, more_details: filteredMoreDetails }
            : null;
        })
        .filter(job => job !== null);
    }

    // Debug: Log the filtering results
    console.log('Filtered data count:', result.length);
    console.log('GJ06BX0741 entries found:', result.filter(job => 
      job.more_details?.some(detail => 
        detail.Vehicle?.includes('GJ06BX0741') || detail.Vehicle?.includes('GJ 06 BX 0741')
      )
    ).length);
    
      setFilteredData(result);
    } catch (error) {
      console.error('Error in applyFilters:', error);
      // Set empty array as fallback
      setFilteredData([]);
    }
  };

  // Apply filters when dependencies change
  useEffect(() => {
    applyFilters();
  }, [
    checkedItems,
    formData.zone,
    searchTerm,
    dateRange,
    vehicleSearchTerm,
    formData.town,
  ]);

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

  const handleCheckedItemsChange = useCallback((items: string[]) => {
    setCheckedItems(items);
  }, []);

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
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search Vehicle Number"
                  className="border rounded px-2 py-1 pr-8 w-48"
                  value={vehicleSearchTerm}
                  onChange={(e) => setVehicleSearchTerm(e.target.value)}
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
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading data...</p>
              </div>
            </div>
          ) : (
            <ExpandableTable data={filteredData} />
          )}
        </div>
      </main>

      <div
        className={`fixed top-0 right-0 h-full bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          isFilterOpen ? "translate-x-0" : "translate-x-full"
        } z-20`}
      >
        <FiltersForm
          filteredData={filteredData}
          // @ts-ignore
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
