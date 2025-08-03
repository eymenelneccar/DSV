
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertProductSchema, type InsertProduct, type Supplier } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  supplierId?: string; // For pre-selecting a supplier
}

export default function ProductForm({ open, onClose, supplierId }: ProductFormProps) {
  const { toast } = useToast();
  
  const form = useForm<InsertProduct>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: "",
      description: "",
      sku: "",
      category: "",
      price: "",
      cost: "",
      currency: "TRY",
      supplierId: supplierId || "",
      quantity: 0,
      minQuantity: 5,
      isActive: true,
    },
  });

  // Reset form when supplier changes
  React.useEffect(() => {
    if (supplierId) {
      form.setValue("supplierId", supplierId);
    }
  }, [supplierId, form]);

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    retry: false,
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: InsertProduct) => {
      console.log("Sending product data to API:", data);
      const response = await apiRequest("POST", "/api/products", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      if (supplierId) {
        queryClient.invalidateQueries({ queryKey: ["/api/suppliers", supplierId, "products"] });
      }
      toast({
        title: "تم بنجاح",
        description: "تم إضافة المنتج بنجاح",
      });
      form.reset();
      if (supplierId) {
        form.setValue("supplierId", supplierId);
      }
      onClose();
    },
    onError: (error: any) => {
      console.error("Product creation error:", error);
      
      let errorMessage = "فشل في إضافة المنتج";
      
      // محاولة استخراج رسالة خطأ أكثر تفصيلاً
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // إظهار أخطاء التحقق إذا كانت موجودة
      if (error?.response?.data?.errors) {
        console.error("Validation errors:", error.response.data.errors);
        errorMessage += " - تحقق من البيانات المدخلة";
      }
      
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertProduct) => {
    console.log("Submitting product data:", data);
    
    // تأكد من تنسيق البيانات بشكل صحيح قبل الإرسال
    const formattedData = {
      ...data,
      price: data.price ? data.price.toString() : "0",
      cost: data.cost ? data.cost.toString() : undefined,
      quantity: data.quantity || 0,
      minQuantity: data.minQuantity || 5,
      supplierId: data.supplierId || null,
      isActive: true,
    };
    
    console.log("Formatted product data:", formattedData);
    createProductMutation.mutate(formattedData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right">إضافة منتج جديد</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم المنتج *</Label>
              <Input
                id="name"
                placeholder="أدخل اسم المنتج"
                {...form.register("name")}
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">رمز المنتج (SKU) *</Label>
              <Input
                id="sku"
                placeholder="مثال: PROD-001"
                {...form.register("sku")}
                className="text-right"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">المورد</Label>
              <Select 
                onValueChange={(value) => form.setValue("supplierId", value)}
                value={form.watch("supplierId") || ""}
                disabled={!!supplierId}
              >
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="اختر المورد" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">العملة *</Label>
              <Select 
                onValueChange={(value) => form.setValue("currency", value)} 
                value={form.watch("currency") || "TRY"}
              >
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="اختر العملة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">ليرة تركية (₺)</SelectItem>
                  <SelectItem value="USD">دولار أمريكي ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">سعر البيع *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register("price")}
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">سعر التكلفة</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register("cost")}
                className="text-right"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">الكمية الحالية</Label>
              <Input
                id="quantity"
                type="number"
                {...form.register("quantity", { valueAsNumber: true })}
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minQuantity">الحد الأدنى للكمية</Label>
              <Input
                id="minQuantity"
                type="number"
                {...form.register("minQuantity", { valueAsNumber: true })}
                className="text-right"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">الفئة</Label>
            <Input
              id="category"
              placeholder="مثال: إلكترونيات"
              {...form.register("category")}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              placeholder="وصف المنتج..."
              {...form.register("description")}
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
              disabled={createProductMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {createProductMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              )}
              إضافة المنتج
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
