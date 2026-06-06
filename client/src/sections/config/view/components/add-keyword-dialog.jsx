import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from "lucide-react";
import CustomModal from "@/components/custom-modal";
import FormProvider, {
  RHFInput,
  RHFTextarea,
  RHFSelect,
  RHFCheckbox,
} from "@/components/hook-form";
import { useApi } from "@/hooks/use-api";
import { toast } from "sonner";

const formSchema = z.object({
  keyword: z.string().min(1, "Name is required"),
});

const AddKeywordModal = ({
  open,
  setOpen,
  selectedItem,
  setSelectedItem,
  refetch,
}) => {
  const { call } = useApi();

  const methods = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      keyword: "",
    },
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (selectedItem) {
      reset({
        keyword: selectedItem.keyword,
      });
    } else {
      reset({
        keyword: "",
      });
    }
  }, [selectedItem, reset]);

  useEffect(() => {
    return () => setSelectedItem(null);
  }, []);

  const onSubmit = async (values) => {
    try {
      const isEdit = !!selectedItem;
      const url = isEdit
        ? `/api/v1/banned-keywords/${selectedItem.id}`
        : `/api/v1/banned-keywords/`;
      const method = isEdit ? "PATCH" : "POST";

      await call(url, method, values);
      toast.success(
        isEdit
          ? "Keyword Successfully Updated!"
          : "Keyword Successfully Created!",
      );
      setOpen(false);
      reset();
      refetch();
    } catch (error) {
      console.log(error);
      toast.error("Something error happened!");
    } finally {
      setSelectedItem(null);
    }
  };

  return (
    <CustomModal
      title={selectedItem ? "Edit Keyword" : "Create Keyword"}
      open={open}
      setOpen={setOpen}
      className="max-w-3xl"
    >
      <FormProvider
        methods={methods}
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col flex-1 overflow-hidden"
      >
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 space-y-6">
          {/* Job Detail */}

          <RHFInput name="keyword" placeholder="Enter Keyword" />
        </div>

        {/* Footer */}
        <div className="px-6 py-6 flex justify-end w-full">
          <Button type="submit" loading={isSubmitting} size={"sm"}>
            Submit
          </Button>
        </div>
      </FormProvider>
    </CustomModal>
  );
};

export default AddKeywordModal;
