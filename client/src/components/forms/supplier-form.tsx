import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertSupplierSchema, type InsertSupplier } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface SupplierFormProps {
  open: boolean;
  onClose: () => void;
}

export default function SupplierForm({ open, onClose }: SupplierFormProps) {
  const { toast } = useToast();
  
  const form = useForm<InsertSupplier>({
    resolver: zodResolver(insertSupplierSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      taxNumber: "",
      paymentTerms: "",
      isActive: true,
    },
  });

  const createSupplierMutation = useMutation({
    mutationFn: async (data: InsertSupplier) => {
      return await apiRequest("POST", "/api/suppliers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "تم بنجاح",
        description: "تم إضافة المورد بنجاح",
      });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "فشل في إضافة المورد",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertSupplier) => {
    createSupplierMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right">إضافة مورد جديد</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">اسم المورد *</Label>
            <Input
              id="name"
              placeholder="أدخل اسم المورد"
              {...form.register("name")}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPerson">جهة الاتصال</Label>
            <Input
              id="contactPerson"
              placeholder="اسم الشخص المسؤول"
              {...form.register("contactPerson")}
              className="text-right"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                placeholder="05xxxxxxxx"
                {...form.register("phone")}
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="supplier@example.com"
                {...form.register("email")}
                className="text-right"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxNumber">الرقم الضريبي</Label>
            <Input
              id="taxNumber"
              placeholder="رقم السجل التجاري أو الضريبي"
              {...form.register("taxNumber")}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentTerms">شروط الدفع</Label>
            <Input
              id="paymentTerms"
              placeholder="مثال: 30 يوم من تاريخ الفاتورة"
              {...form.register("paymentTerms")}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">العنوان</Label>
            <Textarea
              id="address"
              placeholder="عنوان المورد..."
              {...form.register("address")}
              className="text-right min-h-[80px]"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={createSupplierMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {createSupplierMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              )}
              إضافة المورد
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}