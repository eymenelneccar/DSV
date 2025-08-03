import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertTransactionSchema, type InsertTransaction, type Product, type Customer } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Calculator, Receipt } from "lucide-react";
import { z } from "zod";

interface InvoiceFormProps {
  open: boolean;
  onClose: () => void;
}

const invoiceSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, "اسم العميل مطلوب"),
  discount: z.string().default("0"),
  tax: z.string().default("0"),
  items: z.array(z.object({
    productId: z.string().min(1, "المنتج مطلوب"),
    productName: z.string().min(1, "اسم المنتج مطلوب"),
    quantity: z.number().min(1, "الكمية يجب أن تكون أكبر من 0"),
    price: z.string().min(1, "السعر مطلوب"),
    total: z.string(),
  })).min(1, "يجب إضافة منتج واحد على الأقل"),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

export default function InvoiceForm({ open, onClose }: InvoiceFormProps) {
  const { toast } = useToast();
  const [subtotal, setSubtotal] = useState(0);
  const [finalTotal, setFinalTotal] = useState(0);

  // Fetch products and customers
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    retry: false,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    retry: false,
  });

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerName: "",
      customerId: "",
      discount: "0",
      tax: "0",
      items: [{ productId: "", productName: "", quantity: 1, price: "0", total: "0" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const watchedDiscount = form.watch("discount");
  const watchedTax = form.watch("tax");

  // Calculate totals
  useEffect(() => {
    const itemsTotal = watchedItems.reduce((sum, item) => {
      return sum + (Number(item.price) * item.quantity);
    }, 0);
    
    const discount = Number(watchedDiscount) || 0;
    const tax = Number(watchedTax) || 0;
    const afterDiscount = itemsTotal - discount;
    const total = afterDiscount + tax;
    
    setSubtotal(itemsTotal);
    setFinalTotal(total);
    
    // Update item totals
    watchedItems.forEach((item, index) => {
      const itemTotal = Number(item.price) * item.quantity;
      form.setValue(`items.${index}.total`, itemTotal.toString());
    });
  }, [watchedItems, watchedDiscount, watchedTax, form]);

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      const transactionData = {
        customerId: data.customerId || null,
        customerName: data.customerName,
        total: finalTotal.toString(),
        discount: data.discount,
        tax: data.tax,
        status: "completed",
      };

      const items = data.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      }));

      return await apiRequest("POST", "/api/transactions", { transaction: transactionData, items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "تم بنجاح",
        description: "تم إنشاء الفاتورة بنجاح",
      });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "فشل في إنشاء الفاتورة",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InvoiceFormData) => {
    createInvoiceMutation.mutate(data);
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      form.setValue(`items.${index}.productId`, productId);
      form.setValue(`items.${index}.productName`, product.name);
      form.setValue(`items.${index}.price`, product.price);
    }
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      form.setValue("customerId", customerId);
      form.setValue("customerName", customer.name);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            إنشاء فاتورة جديدة
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">معلومات العميل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اختيار عميل موجود</Label>
                  <Select onValueChange={handleCustomerChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر عميل" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerName">اسم العميل *</Label>
                  <Input
                    id="customerName"
                    placeholder="أدخل اسم العميل"
                    {...form.register("customerName")}
                    className="text-right"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                الأصناف
                <Button
                  type="button"
                  size="sm"
                  onClick={() => append({ productId: "", productName: "", quantity: 1, price: "0", total: "0" })}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة صنف
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4 space-y-2">
                      <Label>المنتج</Label>
                      <Select onValueChange={(value) => handleProductChange(index, value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المنتج" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - {product.price} ر.س
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="col-span-2 space-y-2">
                      <Label>الكمية</Label>
                      <Input
                        type="number"
                        min="1"
                        {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                        className="text-right"
                      />
                    </div>
                    
                    <div className="col-span-2 space-y-2">
                      <Label>السعر</Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...form.register(`items.${index}.price`)}
                        className="text-right"
                      />
                    </div>
                    
                    <div className="col-span-3 space-y-2">
                      <Label>المجموع</Label>
                      <div className="h-10 bg-slate-50 border rounded-md flex items-center px-3 text-slate-600">
                        {(Number(watchedItems[index]?.price || 0) * (watchedItems[index]?.quantity || 0)).toFixed(2)} ر.س
                      </div>
                    </div>
                    
                    <div className="col-span-1">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => remove(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                الإجماليات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="discount">الخصم</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    {...form.register("discount")}
                    className="text-right"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax">الضريبة</Label>
                  <Input
                    id="tax"
                    type="number"
                    step="0.01"
                    {...form.register("tax")}
                    className="text-right"
                  />
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">المجموع الفرعي:</span>
                  <span className="font-medium">{subtotal.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">الخصم:</span>
                  <span className="font-medium">-{Number(watchedDiscount || 0).toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">الضريبة:</span>
                  <span className="font-medium">+{Number(watchedTax || 0).toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                  <span>المجموع النهائي:</span>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {finalTotal.toFixed(2)} ر.س
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

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
              disabled={createInvoiceMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {createInvoiceMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              )}
              إنشاء الفاتورة
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}