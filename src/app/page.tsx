"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { JsonForms } from "@jsonforms/react";
import {
  materialRenderers,
  materialCells,
} from "@jsonforms/material-renderers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeProvider, createTheme, TextFieldProps } from "@mui/material";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import VoiceTranscription from "@/components/voice-transcription";
import {
  TranscriptProvider,
  useTranscript,
} from "@/contexts/TranscriptContext";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY as string,
  dangerouslyAllowBrowser: true,
});



function FormBuilder() {
  const [templates, setTemplates] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [formData, setFormData] = useState({});
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateSchema, setNewTemplateSchema] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { transcript } = useTranscript();
  const [useAI, setUseAI] = useState(true);

  useEffect(() => {
    const savedTemplates = localStorage.getItem("jsonFormTemplates");
    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates));
    }
  }, []);

  const saveTemplate = () => {
    setShowErrors(false);
    const newErrors = [];

    if (!newTemplateName.trim()) {
      newErrors.push("Template name is required.");
    }

    try {
      JSON.parse(newTemplateSchema);
    } catch {
      newErrors.push("Invalid JSON schema. Please check your input.");
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      setShowErrors(true);
      return;
    }

    const schema = JSON.parse(newTemplateSchema);
    schema.customErrorMessages = true;
    const updatedTemplates = { ...templates, [newTemplateName]: schema };
    setTemplates(updatedTemplates);
    localStorage.setItem("jsonFormTemplates", JSON.stringify(updatedTemplates));
    setNewTemplateName("");
    setNewTemplateSchema("");
    setErrors([]);
  };

  const handleTemplateSelect = (templateName: string) => {
    setSelectedTemplate(templateName);
    setFormData({});
    setIsSubmitted(false);
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    if (!selectedTemplate) {
      setErrors(["Please select a template before submitting."]);
    }
  };

  const translateErrors = useMemo(
    () => (key: string, defaultMessage: string) => {
      if (key.endsWith(".error.required")) {
        const items = key.split(".");
        const priorToError = items[items.indexOf("error") - 1];
        const priorToErrorTitleCase = priorToError
          ? priorToError
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (str) => str.toUpperCase())
          : null;
        return `${priorToErrorTitleCase} ${
          priorToErrorTitleCase!.endsWith("s") ? "are" : "is"
        } required`;
      } else {
        return defaultMessage;
      }
    },
    [],
  );

  const [variant] = React.useState<TextFieldProps["variant"]>("outlined");

  const theme = React.useMemo(() => {
    return createTheme({
      components: {
        MuiTextField: {
          defaultProps: {
            variant,
          },
        },
        MuiSelect: {
          defaultProps: {
            variant,
          },
        },
        ...(variant !== "standard"
          ? {
              MuiFormControl: {
                styleOverrides: {
                  root: {
                    marginTop: "8px",
                  },
                },
              },
            }
          : {}),
      },
    });
  }, [variant]);

  const fillFormWithAI = useCallback(async () => {
    if (!selectedTemplate || !transcript || !useAI) return;

    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      templates[selectedTemplate]["additionalProperties"] = false;
      try {
        const response = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content:
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                `You are an AI assistant helping to fill out a form based on a transcript. DO NOT FILL OUT SECTIONS IF YOU ARE NOT FULLY CONFIDENT OF THE ANSWER. The JSON object must use the schema: ${templates[selectedTemplate]}`,
            },
            {
              role: "user",

              content: `Please fill out the form based on this transcript: ${transcript}. You must follow the following json schema: ${JSON.stringify(
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                templates[selectedTemplate],
              )}`,
            },
          ],
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" },
        });

        const aiFormData = response?.choices?.[0]?.message?.content
          ? JSON.parse(response.choices[0].message.content)
          : {};
        setFormData(aiFormData);
      } catch (error) {
        console.error("Error filling form with AI:", error);
      }
    } catch (error) {
      console.error("Error filling form with AI:", error);
    }
  }, [selectedTemplate, transcript, templates, useAI]);

  useEffect(() => {
    const interval = setInterval(() => {
      fillFormWithAI();
    }, 2000);

    return () => clearInterval(interval);
  }, [fillFormWithAI]);

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-800">Create New Template</CardTitle>
            <CardDescription className="text-blue-600">
              Build and save a new JSON schema template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="templateName" className="text-blue-700">
                Template Name
              </Label>
              <Input
                id="templateName"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Enter template name"
                className="border-blue-300 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateSchema" className="text-blue-700">
                JSON Schema
              </Label>
              <Textarea
                id="templateSchema"
                value={newTemplateSchema}
                onChange={(e) => setNewTemplateSchema(e.target.value)}
                placeholder="Enter JSON schema"
                rows={10}
                className="border-blue-300 focus:border-blue-500"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start space-y-4">
            <Button
              onClick={saveTemplate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save Template
            </Button>
            {showErrors && errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader>
            <CardTitle className="text-green-800">Fill Out Template</CardTitle>
            <CardDescription className="text-green-600">
              Select a template and fill out the form
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="templateSelect" className="text-green-700">
                Select Template
              </Label>
              <Select
                onValueChange={handleTemplateSelect}
                value={selectedTemplate || undefined}
              >
                <SelectTrigger
                  id="templateSelect"
                  className="border-green-300 focus:border-green-500"
                >
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(templates).map((templateName) => (
                    <SelectItem key={templateName} value={templateName}>
                      {templateName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="ai-toggle"
                checked={useAI}
                onCheckedChange={setUseAI}
              />
              <Label htmlFor="ai-toggle" className="text-green-700">
                Use AI to fill form
              </Label>
            </div>
            {selectedTemplate && (
              <ThemeProvider theme={theme}>
                <JsonForms
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  schema={templates[selectedTemplate]}
                  data={formData}
                  renderers={materialRenderers}
                  cells={materialCells}
                  onChange={({ data }) => {
                    setFormData(data);
                  }}
                  validationMode={
                    isSubmitted ? "ValidateAndShow" : "NoValidation"
                  }
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  i18n={{ translate: translateErrors }}
                />
              </ThemeProvider>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-start space-y-4">
            <Button
              onClick={handleSubmit}
              disabled={!selectedTemplate}
              className="bg-green-600 hover:bg-green-700"
            >
              Submit Form
            </Button>
          </CardFooter>
        </Card>
      </div>
      <div className="mt-8">
        <VoiceTranscription />
      </div>
      <div className="mt-8">
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardHeader>
            <CardTitle className="text-yellow-800">
              Current Transcript
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700">
              {transcript || "No transcript available yet."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <TranscriptProvider>
      <FormBuilder />
    </TranscriptProvider>
  );
}
