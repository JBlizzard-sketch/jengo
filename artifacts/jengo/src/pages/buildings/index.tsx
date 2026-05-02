import { useListBuildings, getListBuildingsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Building as BuildingIcon, MapPin, Users } from "lucide-react";
import { Link } from "wouter";

export default function Buildings() {
  const { data: buildings, isLoading } = useListBuildings({
    query: { queryKey: getListBuildingsQueryKey() }
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading buildings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Buildings</h1>
          <p className="text-muted-foreground">Manage your properties across Nairobi.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {buildings?.map(building => (
          <Link key={building.id} href={`/buildings/${building.id}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">{building.name}</h3>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3 mr-1" />
                      {building.neighbourhood.replace("_", " ")}
                    </div>
                  </div>
                  <div className="p-2 bg-secondary rounded-md">
                    <BuildingIcon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-border flex justify-between items-center text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Users className="w-4 h-4 mr-1" />
                    {building.totalUnits} Units
                  </div>
                  {building.reputationScore && (
                    <div className="font-medium text-primary">
                      Score: {building.reputationScore}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
