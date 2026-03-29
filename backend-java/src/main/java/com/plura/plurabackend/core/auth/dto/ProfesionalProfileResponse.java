package com.plura.plurabackend.core.auth.dto;

import com.plura.plurabackend.core.category.dto.CategoryResponse;
import com.plura.plurabackend.professional.dto.MediaPresentationDto;
import com.plura.plurabackend.professional.plan.ProfessionalPlanEntitlements;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * DTO de respuesta que contiene el perfil completo de un profesional.
 * Incluye datos personales, de negocio, ubicacion, redes sociales y plan contratado.
 */
@Data
@AllArgsConstructor
public class ProfesionalProfileResponse {
    /** Identificador unico del profesional. */
    private String id;
    /** Slug URL-friendly del profesional para su perfil publico. */
    private String slug;
    /** Nombre completo o razon social del profesional/empresa. */
    private String fullName;
    /** Email de contacto del profesional. */
    private String email;
    /** Indica si el email ha sido verificado. */
    private boolean emailVerified;
    /** Numero de telefono de contacto. */
    private String phoneNumber;
    /** Indica si el telefono ha sido verificado. */
    private boolean phoneVerified;
    /** Rubro o categoria principal del negocio. */
    private String rubro;
    /** Ubicacion o nombre del local del profesional. */
    private String location;
    /** Pais donde opera el profesional. */
    private String country;
    /** Ciudad donde opera el profesional. */
    private String city;
    /** Direccion completa del negocio. */
    private String fullAddress;
    /** Latitud de la ubicacion geocodificada. */
    private Double latitude;
    /** Longitud de la ubicacion geocodificada. */
    private Double longitude;
    /** Tipo de cliente: LOCAL, A_DOMICILIO o SIN_LOCAL. */
    private String tipoCliente;
    /** URL del logotipo del profesional/empresa. */
    private String logoUrl;
    /** Encuadre persistido del logotipo del profesional/empresa. */
    private MediaPresentationDto logoMedia;
    /** URL del banner del profesional/empresa. */
    private String bannerUrl;
    /** Encuadre persistido del banner del profesional/empresa. */
    private MediaPresentationDto bannerMedia;
    /** Enlace al perfil de Instagram. */
    private String instagram;
    /** Enlace al perfil de Facebook. */
    private String facebook;
    /** Enlace al perfil de TikTok. */
    private String tiktok;
    /** Enlace al sitio web del profesional. */
    private String website;
    /** Numero de WhatsApp de contacto. */
    private String whatsapp;
    /** Titulo o frase destacada visible en el perfil publico. */
    private String publicHeadline;
    /** Descripcion "Acerca de" visible en el perfil publico. */
    private String publicAbout;
    /** Lista de URLs de fotos publicas del profesional o negocio. */
    private List<String> publicPhotos;
    /** Categorias de servicios que ofrece el profesional. */
    private List<CategoryResponse> categories;
    /** Codigo canonico del plan profesional. */
    private String professionalPlan;
    /** Entitlements canonicos del plan profesional. */
    private ProfessionalPlanEntitlements professionalEntitlements;
    /** Fecha y hora de creacion del perfil profesional. */
    private LocalDateTime createdAt;
    /** Calificacion promedio del profesional basada en reseñas de clientes. */
    private Double rating;
    /** Cantidad total de reseñas recibidas. */
    private Integer reviewsCount;
}
