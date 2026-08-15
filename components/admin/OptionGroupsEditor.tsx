import { NewOptionGroupDialog } from "@/components/admin/NewOptionGroupDialog";
import { OptionGroupCard } from "@/components/admin/OptionGroupCard";
import type { AdminMenuItem } from "@/lib/types/adminMenu";

export function OptionGroupsEditor({ item }: { item: AdminMenuItem }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Opciones y extras</h2>
        <NewOptionGroupDialog menuItemId={item.id} nextSortOrder={item.optionGroups.length} />
      </div>

      {item.optionGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin grupos de opciones todavía.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {item.optionGroups.map((group) => (
            <OptionGroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
