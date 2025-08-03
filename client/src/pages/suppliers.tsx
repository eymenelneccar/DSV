
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import SupplierForm from "@/components/forms/supplier-form";
import ProductForm from "@/components/forms/product-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Search, Plus, Edit, Trash2, Phone, Mail, MapPin, FileText, Package, Eye } from "lucide-react";
import type { Supplier, Product } from "@shared/schema";

export default function Suppliers() {
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("all");
  const [activeTab, setActiveTab] = useState("suppliers");
  const { toast } = useToast();

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers", search],
    retry: false,
  });

  const { data: supplierProducts = [], refetch: refetchProducts } = useQuery<Product[]>({
    queryKey: ["/api/suppliers", selectedSupplier, "products"],
    queryFn: async () => {
      if (!selectedSupplier) return [];
      const response = await apiRequest("GET", `/api/suppliers/${selectedSupplier}/products`);
      return await response.json();
    },
    enabled: !!selectedSupplier,
    retry: false,
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "تم الحذف",
        description: "تم حذف المورد بنجاح",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "غير مصرح",
          description: "تم تسجيل خروجك. جارٍ تسجيل الدخول مرة أخرى...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "خطأ",
        description: "فشل في حذف المورد",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا المورد؟")) {
      deleteSupplierMutation.mutate(id);
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(search.toLowerCase());
    
    if (sortBy === "all") return matchesSearch;
    if (sortBy === "newest") return matchesSearch;
    if (sortBy === "name") return matchesSearch;
    
    return matchesSearch;
  }).sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime();
    }
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  const getCurrencySymbol = (currency: string) => {
    return currency === "USD" ? "$" : "₺";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="إدارة الموردين"
          subtitle="إدارة قاعدة بيانات الموردين والتواصل معهم"
        />
        <main className="flex-1 overflow-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="suppliers" onClick={() => setSelectedSupplier(null)}>قائمة الموردين</TabsTrigger>
              <TabsTrigger value="products" disabled={!selectedSupplier}>
                منتجات المورد {selectedSupplier && suppliers.find(s => s.id === selectedSupplier)?.name && `(${suppliers.find(s => s.id === selectedSupplier)?.name})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="suppliers" className="space-y-6">
              {/* Search and Add */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative max-w-md">
                    <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="البحث في الموردين..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="فرز حسب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الموردين</SelectItem>
                      <SelectItem value="newest">الأحدث</SelectItem>
                      <SelectItem value="name">الاسم</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة مورد جديد
                </Button>
              </div>

              {/* Suppliers Grid */}
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/2 mb-4"></div>
                        <div className="h-8 bg-slate-200 rounded w-full"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <Truck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">لا يوجد موردون</h3>
                    <p className="text-slate-600 mb-4">
                      {search ? "لم يتم العثور على موردين مطابقين للبحث" : "ابدأ بإضافة موردين إلى قاعدة البيانات"}
                    </p>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => setShowAddForm(true)}
                    >
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة مورد جديد
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSuppliers.map((supplier: Supplier) => (
                    <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-1 flex items-center gap-2">
                              <Truck className="h-5 w-5 text-blue-600" />
                              {supplier.name}
                            </CardTitle>
                            <Badge variant={supplier.isActive ? "default" : "secondary"}>
                              {supplier.isActive ? "نشط" : "غير نشط"}
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setSelectedSupplier(supplier.id);
                                setActiveTab("products");
                              }}
                              title="عرض منتجات المورد"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                              onClick={() => {
                                setSelectedSupplier(supplier.id);
                                setShowProductForm(true);
                              }}
                              title="إضافة منتج للمورد"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(supplier.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {supplier.contactPerson && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <span className="font-medium">جهة الاتصال:</span>
                              <span>{supplier.contactPerson}</span>
                            </div>
                          )}
                          {supplier.phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Phone className="h-4 w-4" />
                              <span>{supplier.phone}</span>
                            </div>
                          )}
                          {supplier.email && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Mail className="h-4 w-4" />
                              <span className="truncate">{supplier.email}</span>
                            </div>
                          )}
                          {supplier.address && (
                            <div className="flex items-start gap-2 text-sm text-slate-600">
                              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{supplier.address}</span>
                            </div>
                          )}
                          {supplier.taxNumber && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <FileText className="h-4 w-4" />
                              <span>الرقم الضريبي: {supplier.taxNumber}</span>
                            </div>
                          )}
                          {supplier.paymentTerms && (
                            <div className="text-sm text-slate-600">
                              <span className="font-medium">شروط الدفع:</span> {supplier.paymentTerms}
                            </div>
                          )}
                          <div className="pt-2 border-t border-slate-200">
                            <p className="text-xs text-slate-500">
                              انضم في {new Date(supplier.createdAt || "").toLocaleDateString('ar-SA')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="products" className="space-y-6">
              {selectedSupplier && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      منتجات {suppliers.find(s => s.id === selectedSupplier)?.name}
                    </h3>
                    <div className="flex gap-2">
                      <Button 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => setShowProductForm(true)}
                      >
                        <Plus className="h-4 w-4 ml-2" />
                        إضافة منتج
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSelectedSupplier(null);
                          setActiveTab("suppliers");
                        }}
                      >
                        العودة للموردين
                      </Button>
                    </div>
                  </div>

                  {supplierProducts.length === 0 ? (
                    <Card className="text-center py-12">
                      <CardContent>
                        <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">لا توجد منتجات</h3>
                        <p className="text-slate-600 mb-4">لا يوجد منتجات مسجلة لهذا المورد حتى الآن</p>
                        <Button 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => setShowProductForm(true)}
                        >
                          <Plus className="h-4 w-4 ml-2" />
                          إضافة أول منتج
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {supplierProducts.map((product: Product) => (
                        <Card key={product.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg mb-1">{product.name}</CardTitle>
                                <Badge variant="outline">{product.sku}</Badge>
                              </div>
                              <Badge variant={(product.quantity || 0) > (product.minQuantity || 0) ? "default" : "destructive"}>
                                {product.quantity || 0} قطعة
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">سعر البيع:</span>
                                <span className="font-semibold text-green-600">
                                  {product.price} {getCurrencySymbol(product.currency || "TRY")}
                                </span>
                              </div>
                              {product.cost && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-600">سعر التكلفة:</span>
                                  <span className="text-slate-800">
                                    {product.cost} {getCurrencySymbol(product.currency || "TRY")}
                                  </span>
                                </div>
                              )}
                              {product.category && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-600">الفئة:</span>
                                  <span className="text-slate-800">{product.category}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">العملة:</span>
                                <Badge variant="secondary">
                                  {product.currency === "USD" ? "دولار أمريكي" : "ليرة تركية"}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <SupplierForm open={showAddForm} onClose={() => setShowAddForm(false)} />
      <ProductForm 
        open={showProductForm} 
        onClose={() => {
          setShowProductForm(false);
          if (selectedSupplier && activeTab !== "products") {
            setActiveTab("products");
          }
        }}
        supplierId={selectedSupplier || undefined}
      />
    </div>
  );
}
